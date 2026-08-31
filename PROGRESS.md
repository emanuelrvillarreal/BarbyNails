# Barby Nails & Spa — Bitácora del proyecto

Este documento resume las decisiones tomadas y el estado de avance, para no perder contexto entre sesiones. Se va actualizando a medida que avanzamos.

## Stack definido

| Capa | Elección |
|---|---|
| Frontend | React + Tailwind + Vite |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma 6 (config tradicional por `schema.prisma`, no v7 por la complejidad extra de driver adapters) |
| Base de datos | PostgreSQL en **Supabase** (free tier) |
| Auth | JWT + bcrypt, roles `OWNER` (dueña) / `PROFESSIONAL` |
| Hosting pensado | Frontend → Vercel · Backend → Render (free tier) · DB → Supabase |

## Decisiones clave de producto (por qué se hizo así)

- **WhatsApp: 100% manual, sin API.** Se descartó la Cloud API de Meta / Twilio / 360dialog para evitar costos y riesgo de bloqueo. El sistema arma el mensaje (con plantillas editables por motivo: recordatorio de turno, pago pendiente, promoción) y abre un link `wa.me` prellenado — la dueña/profesional aprieta "enviar" desde su propio WhatsApp. Las respuestas (confirmado/cancelado) se cargan a mano también, no hay webhook.
- **Envíos masivos (promos):** se arma como "campaña" con cola de links individuales. Si la clienta ya está marcada como `isSavedContact`, se sugiere usar la lista de difusión nativa de WhatsApp Business en vez de mandar uno por uno (más seguro contra el antispam de WhatsApp). Campo `Client.isSavedContact` ya está en el modelo para esto.
- **Categorías de servicio:** tabla editable (`ServiceCategory`), no un enum fijo — la dueña las gestiona desde el sistema.
- **Horarios por profesional:** configurables por día de semana (`ProfessionalSchedule`), no fijos globalmente.
- **Buffer de tolerancia:** cada servicio tiene `bufferMinutes` configurable. Si un turno combina varios servicios, el buffer se aplica **una sola vez al final** (se toma el máximo entre los servicios elegidos, no se suman).
- **Huecos de agenda:** no se guardan en tabla — se calculan siempre al vuelo a partir de `ProfessionalSchedule` menos los `Appointment` activos. Así nunca quedan desincronizados al cancelar/mover un turno.
- **Semáforo de vigencia de clientas:** también calculado al vuelo (última visita ≤ 3 meses = activa), no una columna.
- **Precios/duraciones históricos:** cada turno y cada cobro guarda una copia (`priceAtBooking`, `durationMinutesAtBooking`, etc.) del catálogo al momento de la operación, para que un cambio de precio futuro no altere registros pasados.
- **Asistencia del personal:** estado 100% manual y editable — tanto la profesional (marca su propia llegada/salida) como la dueña (puede setear cualquier estado a cualquier profesional: presente, tarde, se fue antes, ausente, ausencia justificada). No hay tolerancia automática todavía (a definir más adelante).
- **Rol Profesional en Agenda:** ve vista semanal y diaria (no solo diaria), pero el backend fuerza el filtro a su propio `professionalId` — nunca puede ver la agenda de otra ni datos de Finanzas.

## Modelo de datos

Definido completo en [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma). 18 tablas cubriendo los 6 módulos (Agenda, WhatsApp manual, Catálogo, Clientas/CRM, Finanzas, Personal). Fase 2 (stock, combos, lista de espera) documentada como comentario al final del archivo, sin crear tablas todavía.

## Credenciales / accesos

- **Supabase**: proyecto ya creado (`izxjicjtfmefnfbxzsgf`, región `sa-east-1`). Connection strings guardadas en `backend/.env` (no versionado, está en `.gitignore`).
  - ⚠️ Pendiente: rotar la contraseña de la base (Project Settings → Database → Reset database password) porque viajó por el chat en texto plano durante el setup.
- **Usuaria de prueba** (creada por el seed): `duena@barbynails.com` / `admin123` — **cambiar antes de ir a producción**.

## Estado de avance

### ✅ Hecho
- Modelo de datos completo, revisado y validado en Supabase (migración `20260822031718_init` aplicada).
- Backend Express + TypeScript + Prisma funcionando localmente contra Supabase.
- Módulo **Auth**: login con JWT.
- Módulo **Agenda**: crear turno (con cálculo automático de duración+buffer y snapshot de precios), listar turnos por rango/profesional (con restricción de rol), cambiar estado, y endpoint de huecos calculados al vuelo. Probado de punta a punta con casos reales (turno superpuesto rechazado con 409, huecos correctos, hueco reaparece al cancelar).
- Módulos de soporte mínimos: Profesionales (list/create), Clientas (list con semáforo/search, create), Catálogo (categorías y servicios, list/create).
- Bug encontrado y corregido durante las pruebas: el cálculo de huecos mezclaba horario local del servidor con horarios en UTC — daba resultados distintos según el huso horario del server. Corregido para que todo el cálculo sea en UTC puro.

- Frontend (React + Tailwind v4 + Vite + react-router): login funcional contra el backend, y pantalla de **Agenda completa**:
  - Vista Día y Semana (5 días martes–sábado), columnas por profesional, franjas de 30 min.
  - Huecos resaltados en verde punteado, clickeables para agendar (solo rol Owner).
  - Modal de creación de turno: buscar clienta existente o cargar una nueva, selección múltiple de servicios con cálculo de duración total + buffer en vivo, submit contra el backend.
  - Modal de detalle de turno: ver clienta/servicios/horario, confirmar o cancelar (respeta permisos: profesional solo sus propios turnos).
  - Colores por estado (Pendiente=ámbar, Confirmado=verde, Cancelado=gris tachado), lista aparte de cancelados del día para no tapar el hueco liberado.
  - Probado de punta a punta con navegador automatizado: login → crear clienta+turno → aparece en la grilla con color correcto → confirmar → cambia de color → vista semana renderiza los 5 días. Sin errores de consola ni requests fallidos.

- Backend: ABM completo de Clientas (`GET /clients/:id` con historial de turnos, `PATCH /clients/:id`) y de Catálogo (`PATCH` para categorías y servicios, baja lógica vía `active:false`). El semáforo de vigencia ahora excluye turnos cancelados del cálculo de "última visita" (bug menor corregido en el camino).
- Frontend: pantalla **Clientas** (búsqueda por nombre, filtro Activa/Inactiva con semáforo verde/violeta, alta/edición con servicios de interés, detalle con historial de turnos, acción rápida "Enviar promo" por WhatsApp manual vía `wa.me` para inactivas) y pantalla **Catálogo** (alta rápida de categorías con baja, alta/edición de servicios con precio/duración/buffer, protegido contra borrar categorías con servicios activos). Se agregó un `NavBar` con las 3 secciones, oculto para el rol Profesional (Clientas/Catálogo son `ownerOnly` en las rutas).
- Probado de punta a punta en navegador: crear categoría → crear servicio → crear clienta con ese servicio de interés → verla en la lista con semáforo correcto → abrir su detalle con historial. Se generaron datos duplicados por reintentos del script de prueba (no por bugs de la app) y ya se limpiaron de Supabase.

- **Backend Finanzas** (`/api/finance`): movimientos (ingresos/egresos con cálculo automático de neto según comisión de MP vigente a la fecha — histórico versionado en `payment_method_fees`), caja diaria (abrir/cerrar, resumen, historial), comisiones por profesional (preview en vivo + liquidar + marcar pagada), reportes (totales por medio de pago y por profesional en un rango).
- **Frontend Finanzas**: pantalla con 4 pestañas — Movimientos (alta con autocompletado de monto según servicios elegidos, borrado si no está en una caja cerrada), Caja diaria (abrir/cerrar, historial 30 días), Comisiones (preview + liquidar + marcar pagada), Reportes (por medio de pago bruto/neto, por profesional). Panel aparte para configurar el % de comisión de MP QR/Point.
- Probado de punta a punta: ingreso por MP QR con 3.5% de comisión → bruto $8.000 / neto $7.720 calculado correctamente; egreso; caja diaria con balance correcto; comisión de profesional calculada (40% → $3.200) y liquidada; reportes con los totales correctos. Datos de prueba limpiados de Supabase al terminar (se dejó configurada la comisión MP real como base: QR 3.5%, Point 5.2% — **ajustar a las tasas reales que le cobra Mercado Pago a la dueña**).

- **Backend Personal**: ABM completo de profesionales (`PATCH /professionals/:id` con reemplazo de horarios), creación de login de acceso por profesional (`POST /professionals/:id/login`, rol `PROFESSIONAL` asociado). Módulo **Asistencia** (`/api/attendance`): la profesional marca su propia llegada/salida (`POST /attendance/checkin` y `/checkout`, quedan como `PRESENT`), la dueña puede setear cualquier estado a cualquier profesional en cualquier fecha (`PUT /attendance/status`, upsert por `professionalId+date`) — sin tolerancia automática todavía, tal como se definió.
- **Frontend Personal**: pantalla con pestañas Personal (ABM con editor de horario por día de semana, botón para dar de baja, creación de acceso) y Asistencia (grilla por profesional con botones de estado para la dueña). En la Agenda, si el usuario logueado es Profesional, aparece un widget de "Marcar llegada/salida" en el header — reemplaza su propio registro del día.
- Probado de punta a punta: edición de profesional con horario Martes–Sábado, creación de login para Luciana, la dueña marcó "Llegó tarde" desde Asistencia, luego se logueó como Luciana, confirmó que el nav solo muestra "Agenda" (sin acceso a Clientas/Catálogo/Finanzas/Personal) y que su grilla muestra solo su propia columna, marcó su propia llegada con el widget (que sobrescribe el estado a Presente — comportamiento esperado del auto-fichaje).

- **Backend WhatsApp** (`/api/whatsapp`): plantillas por motivo (recordatorio de turno / pago pendiente / promoción) con placeholders resueltos server-side; recordatorios de turno (preview del mensaje + marcar enviado + actualizar estado manual — al marcar Confirmado/Cancelado también sincroniza el `Appointment.status`, así el hueco se libera solo si se cancela por WhatsApp); campañas (pago pendiente/promoción) con destinatarias y envío individual trackeado. Permisos: la profesional puede notificar/marcar enviado solo en sus propios turnos (mismo patrón que Agenda); todo lo demás (plantillas, seguimiento general, campañas) es solo de la dueña.
- **Frontend WhatsApp**: pantalla con 3 pestañas — Seguimiento de turnos (lista con botón Notificar/Reenviar y selector de estado manual), Campañas (alta con selección de clientas — filtro Activa/Inactiva —, vista de detalle que separa automáticamente "guardadas en WhatsApp" de "cola individual" usando `isSavedContact`), Plantillas (ABM con variables disponibles listadas por tipo). En la Agenda se agregó el botón "Notificar por WhatsApp" en el detalle de cada turno (visible para ambos roles). En la ficha de clienta se agregó el checkbox "La tengo guardada en mi WhatsApp".
- Probado de punta a punta: plantilla de recordatorio con placeholders → turno real → botón Notificar abrió `wa.me` con el mensaje ya resuelto ("Hola Noelia! Te esperamos el 25/08/2026 a las 14:00 con Luciana para Manicura semipermanente...") → marcado como enviado → en Seguimiento se cambió el estado a Confirmado → el turno pasó a Confirmado en la Agenda automáticamente. Campaña de promoción con 2 destinatarias (una guardada, una no) separó correctamente los dos grupos y trackeó el envío individual. Datos de prueba limpiados de Supabase (las 2 plantillas de ejemplo quedaron, igual que el profesional/servicio semilla).

Con este módulo **los 6 quedaron construidos y probados de punta a punta**: Agenda, Clientas, Catálogo, Finanzas, Personal, WhatsApp.

### 🐛 Bugs reportados y corregidos (sesión de revisión)
- **Puesto no se veía en la grilla de Personal**: estaba hardcodeado como "—" en la tabla, y el formulario de edición tampoco precargaba `phone`/`position` del profesional existente (los pisaba con vacío en cada edición). Corregido en ambos lugares.
- **Profesional nueva no se podía asignar en la Agenda**: el formulario de alta arrancaba sin ningún día tildado en el horario — si la dueña no marcaba los días a mano, la profesional quedaba con cero horario y por lo tanto invisible/no-clickeable en toda la grilla, sin ninguna explicación visual. Corregido: ahora una profesional nueva arranca con Martes a Sábado 9-18hs precargado (se puede ajustar), hay una validación que avisa si se guarda sin ningún día tildado, y además la grilla ahora muestra explícitamente "Sin horario cargado este día" en vez de una columna gris sin explicación (esto último ayuda también para profesionales existentes que no atienden un día puntual, como el caso real de "Nubi" sin sábado).

### 🎨 Rediseño visual (pedido: menos básico, más color y botones llamativos)
- Sistema de estilos reutilizable en `index.css` (`btn-primary`, `btn-success`, `btn-danger`, `btn-danger-soft`, `btn-secondary`, `btn-ghost`, `link-action`, `tab-item`, `segment-active/inactive`, `stat-card`) aplicado de forma consistente en los 6 módulos — botones primarios ahora con degradé rosa-fucsia, sombra y micro-animación al hover.
- `NavBar` con marca (ícono 💅 en degradé) y pestañas activas como pill con degradé y sombra.
- Login con fondo degradé suave y tarjeta con sombra más marcada.
- Nuevo componente `StatCard` (tarjetas de Ingresos/Egresos/Balance/Apertura en Finanzas) con degradé de color por tipo e ícono.
- Badges de estado (Activa/Inactiva en Clientas, Pendiente/Confirmado en Agenda) pasaron de fondo pastel a color sólido con sombra — mucho más visibles de un vistazo.
- Grilla de Agenda: los turnos ahora son chips con degradé sólido por estado (ámbar→naranja Pendiente, verde→teal Confirmado) y se levantan levemente al hover; los huecos libres se iluminan en verde-teal al pasar el mouse.
- Todos los controles segmentados (Día/Semana, Activas/Inactivas, tabs de página) unificados con el mismo estilo de pill con degradé cuando están activos.

### 🗓️ Vista Mes en Agenda
- Se agregó un tercer modo (Día / Semana / **Mes**) a la Agenda. La vista Mes muestra un calendario tradicional (Lunes a Domingo) del mes completo, con navegación mes a mes (incluye meses futuros sin límite) mediante las flechas o saltando directo con el selector de mes.
- Cada día muestra un resumen liviano: cantidad de turnos pendientes/confirmados con badges de color, y los domingos/lunes (el salón no atiende) se marcan como "Cerrado". El día de hoy se resalta con un círculo en degradé.
- Hacer click en cualquier día del mes (pasado, presente o futuro) salta directo a la vista Día de esa fecha, donde ya se puede reservar normalmente haciendo click en un hueco libre — así se puede agendar en cualquier punto del mes actual o de los siguientes sin necesidad de ir avanzando de a un día.
- La vista Mes usa un fetch liviano (solo turnos, sin cálculo de huecos por profesional) para no sobrecargar la carga al traer 6 semanas de datos de una vez.
- Probado en navegador: conteo correcto de turnos por día, navegación a "Septiembre de 2026", y click en un día lleva correctamente a la grilla Día de esa fecha.

### ✨ Nuevas funcionalidades agregadas
- **Botón "Servicio Terminado" en la Agenda**:
  - Se agregó el valor `COMPLETED` al enum `AppointmentStatus` de la base de datos (Prisma schema + Supabase).
  - En el modal de detalle del turno en el frontend, se incorporó el botón destacado **"✨ Servicio Terminado"** con gradiente índigo/púrpura.
  - Los turnos terminados se visualizan en la grilla con su insignia identificatoria "Terminado".

- **Gestión Avanzada de Asistencia con Entrada, Salida y Observaciones**:
  - En la pestaña de Asistencia en el módulo Personal, ahora se pueden editar directamente las horas de llegada (`checkInTime`), horas de salida (`checkOutTime`) y un campo libre de **Observaciones** por profesional para anotar detalles de tardanza o salidas anticipadas.
  - Soporta guardado rápido por fila o actualización rápida de estado (Presente, Llegó Tarde, Salió Antes, Ausente, Ausencia Justificada).

- **Exportación de Asistencia a Excel / CSV**:
  - Se agregó el botón **"📊 Descargar Excel (Mes)"** en la pantalla de Asistencia.
  - Backend: endpoint `GET /api/attendance/export` que genera y descarga una planilla formateada en UTF-8 BOM con separador de punto y coma (`;`), 100% compatible con Microsoft Excel en español (columnas: Fecha, Profesional, Horario Entrada, Horario Salida, Estado, Observaciones).

### 💳 Historial de pagos en la ficha de clienta
- El detalle de clienta ahora tiene una sección **"Historial de pagos"** (separada del historial de turnos agendados) que muestra, por cada cobro real registrado en Finanzas: fecha/hora, medio de pago, y el desglose de qué profesional la atendió + qué servicio + cuánto abonó por cada uno, más el total. A diferencia del historial de turnos (que muestra lo agendado, incluso si nunca se cobró), esto refleja la plata que realmente entró.
- Backend: `GET /clients/:id` ahora también trae `payments` (las `Transaction` tipo `INCOME` de esa clienta con sus `TransactionService` — profesional, servicio, monto).
- Probado de punta a punta: se cargó un cobro real en Finanzas para una clienta y apareció correctamente en su ficha con profesional/servicio/monto.

### 🔒 Auditoría de Supabase Advisor (20 issues) — corregido
- El Advisor marcaba **20 tablas sin Row Level Security (RLS)**. Se verificó primero que nuestra conexión (rol `postgres`, usado por Prisma) tiene `bypassrls: true`, así que activar RLS no afecta en nada al funcionamiento de la app — solo cierra la API REST pública que Supabase genera automáticamente para cada tabla (que nunca usamos, pero queda expuesta igual si no se activa RLS). Se activó RLS en las 19 tablas que faltaban (aplicado directo por SQL, ya que el historial de migraciones estaba desactualizado respecto al schema real).
- También se detectaron **21 columnas de foreign key sin índice** (hallazgo de performance, no de seguridad). Se agregaron los 21 índices por SQL y se reflejaron con `@@index(...)` en `schema.prisma` para que no se pierdan si en el futuro se corre `prisma db push`.
- Verificado que la app sigue funcionando igual después de ambos cambios (requests de prueba en 200 antes y después).

### 🖼️ Bug: logo no se veía / no se podía guardar
- **Causa 1 (no se veía):** se había cargado como URL el link de una foto de Instagram (`cdninstagram.com`). Instagram bloquea el hotlinking desde otros sitios (devuelve 403), así que esa imagen nunca iba a cargar sin importar qué se reiniciara. Se agregó en Configuración un **selector de archivo real** (sube la imagen como `data:` URL en base64, sin depender de links externos) — el campo de URL quedó como opción avanzada colapsada, con una advertencia explícita sobre no usar links de redes sociales.
- **Causa 2 ("No se pudo guardar la configuración de marca"):** el límite de tamaño de body de Express estaba en el default de **100kb**, insuficiente para una foto real en base64 (una imagen de ~300KB ya lo superaba con el 413 disfrazado de "Error interno del servidor" porque el handler de errores no distinguía ese caso). Se subió el límite a 5MB (`express.json({ limit: '5mb' })`) y se agregó un mensaje claro si igual se excede.
- Probado de punta a punta: subida de archivo real (~280KB) → guarda con éxito → persiste después de recargar → se ve en el nav y en el login, sin errores 403 ni 500.

### 🔑 Bug: pantallas se quedaban vacías/"Cargando..." sin explicación
- Causa real: el JWT expira a las 12hs, y **nada en el frontend manejaba una respuesta 401** — cuando el token vencía, cada pedido a la API fallaba en silencio (quedaba como unhandled rejection en la consola) y la pantalla se quedaba trabada sin cargar nada, dando la falsa impresión de que "se perdieron los datos". Los datos nunca estuvieron perdidos: seguían todos en Supabase.
- Corregido en `frontend/src/api/client.ts`: ahora cualquier respuesta 401 limpia la sesión guardada y redirige automáticamente a `/login`, en vez de quedarse colgado.
- Recomendación: si alguna vez la pantalla se traba de nuevo sin motivo aparente, lo primero es cerrar sesión y volver a entrar — con este fix debería ya resolverse solo.

### ⚠️ Incidente a tener en cuenta
- Durante esta sesión, para liberar un archivo de Prisma bloqueado, se ejecutó por error un comando que mata **todos** los procesos `node` de la máquina (no solo los de este proyecto). Si en algún momento otro proceso Node tuyo se cortó de golpe sin explicación, es probablemente por eso. Se corrigió el enfoque para versiones futuras: matar solo el proceso puntual del backend por su PID, nunca todos los `node` de la máquina.
- Se detectó que gran parte del código fue modificado en paralelo con otra herramienta (mencionada como "Antigravity" por la dueña) — se agregaron el rol `SYSADMIN`, `SystemSettings` (branding), gestión de usuarios, lista negra de clientas, estado `COMPLETED` en turnos, exportación de asistencia a CSV, entre otros. Esos cambios se respetaron tal cual están, sin revertir nada.

### 🎤 Auditoría contra los audios de la dueña (planilla Excel actual)
Se revisó el sistema contra dos audios donde la dueña explica cómo usa su Excel hoy. De 8 puntos concretos, 5 ya estaban cubiertos (agenda semanal navegable, caja con ingresos/egresos sueltos tipo seña o gasto chico, grilla por profesional en bloques de 30min, cálculo automático de neto por medio de pago, panel financiero oculto para las empleadas — ellas solo ven su propia comanda). Quedaron 3 huecos reales identificados para resolver:
1. **Comisión variable por tipo de servicio** (ej. uñas 50%, cejas/pestañas otro %) — antes solo existía un % fijo por profesional aplicado a todo.
2. Bloqueo visual de la columna de una profesional ausente en la Agenda (pintarla de "cerrado"/negro).
3. Notas de clienta por visita (hoy es un solo campo de texto general, no versionado por fecha/servicio) — crítico porque las clientas rotan de profesional y necesitan saber alergias/cuidados especiales de la última vez.

### 💰 Comisiones variables por categoría de servicio (resuelve el hueco #1)
- **Modelo de datos**: tabla nueva `ProfessionalCommissionRate` (profesional + categoría + %), con `@@unique([professionalId, categoryId])`. Si una profesional no tiene excepción cargada para una categoría, se sigue usando su `commissionPct` general de siempre — no se rompió nada de lo existente. Aplicado a Supabase con `prisma db push` (el historial de migraciones seguía desactualizado).
- **Backend** (`/api/finance/commissions/rates`): `GET` (listar, opcionalmente filtrado por profesional), `PUT` (crear/editar una excepción), `DELETE` (quitarla y volver al % general). El cálculo de comisión (`getCommissionPreview`) ahora desglosa por categoría: agrupa los servicios cobrados por categoría, aplica el % que corresponda a cada una (excepción si existe, general si no), y devuelve tanto el desglose como el total y un "% promedio ponderado" para mostrar de un vistazo. Las liquidaciones (`CommissionSettlement`) ahora guardan ese desglose completo en un campo `breakdown` (JSON) para que quede el registro histórico exacto de cómo se calculó, sin importar que las excepciones cambien después.
- **Frontend**: en Finanzas → Comisiones se agregó el botón **"⚙️ Comisiones por categoría"** que abre una matriz (filas = profesionales, columnas = categorías) donde la dueña edita cualquier % en cualquier momento — el casillero vacío usa el % general, y se guarda solo al salir del campo (no hace falta un botón "Guardar" aparte). La vista previa de comisión ahora muestra una tabla con el desglose por categoría (monto, %, comisión), marcando con un badge "excepción" las categorías que tienen un % distinto al general.
- Probado de punta a punta: se cargó una excepción de 30% en "Manos" para una profesional (su % general era 40%) → el desglose mostró Manos a $2.400 (30% de $8.000, con badge "excepción") y Pies a $3.800 (40% general, sin tocar) → total $6.200 → el % promedio ponderado del header se recalculó solo (35.43%). Dato de prueba limpiado después.

### 💵 Propinas conectadas a la liquidación de comisión (resuelve pendiente)
- Las propinas nunca llevan %: se atribuyen enteras a quien hizo el servicio, aparte de la comisión. Si un cobro tiene una sola profesional (el caso normal), le corresponde el 100% de la propina de ese cobro; si un cobro se reparte entre varias (poco común, pero el modelo lo permite), se prorratea según cuánto facturó cada una ahí.
- `getCommissionPreview` ahora devuelve `totalTips` y `grandTotal` (comisión + propinas = lo que realmente hay que pagarle). `CommissionSettlement` guarda `totalTips` al liquidar, para que quede el registro histórico exacto.
- Frontend: la vista previa de Comisiones muestra 4 números (Total servicios / Comisión / + Propinas / Total a pagar), y la tabla de liquidaciones generadas tiene columnas de Propinas y Total.

### 🚫 Bloqueo visual por ausencia en la Agenda (resuelve el hueco #2 de la auditoría)
- Backend: nuevo endpoint liviano `GET /api/attendance/absences?from=&to=` que devuelve solo las ausencias (estado `ABSENT` o `JUSTIFIED_ABSENCE`) en un rango, sin traer toda la asistencia — pensado para no sobrecargar la carga de la Agenda.
- Frontend: la Agenda pide las ausencias del rango visible (día/semana) y si una profesional está marcada ausente ese día puntual, toda su columna se pinta de negro con un badge "AUSENTE" en el header, y sus huecos dejan de ser clickeables (no se pueden asignar turnos nuevos). Si ya tenía turnos agendados antes de faltar, esos turnos se siguen viendo con su color normal encima del fondo negro, para que la dueña decida si los reasigna o cancela.
- Probado en navegador: se marcó una profesional como ausente para un día puntual → su columna quedó negra con "AUSENTE", mientras la otra profesional siguió mostrando sus huecos verdes normales. Dato de prueba revertido a "Presente" al terminar.

### 📝 Notas de clienta por visita (resuelve el hueco #3, cierra la auditoría de los audios)
- **Modelo de datos**: tabla nueva `ClientNote` (clienta + autor + texto + fecha, con link opcional a un turno puntual) — a diferencia de `Client.internalNotes` (un solo campo que se pisa), esto es un **historial versionado**: cada nota queda fechada y con quién la escribió, sin perder las anteriores.
- **Backend**: dos caminos de acceso distintos, a propósito:
  - `GET/POST /clients/:id/notes` — CRM completo, solo para la dueña.
  - `GET/POST /agenda/appointments/:id/notes` — acceso puntual para que la profesional vea y agregue notas de la clienta **de su propio turno** (historial completo de esa clienta, no solo la nota del día), sin abrirle el resto del CRM. Se verificó que si intenta ver notas de un turno de otra profesional, o pegarle directo al endpoint de Clientas, le devuelve 403.
- **Frontend**: componente compartido `ClientNotesSection` (lista + campo para agregar) usado tanto en la ficha de clienta (`ClientDetailModal`, dueña) como en el detalle del turno (`AppointmentDetailModal`, ambos roles) — así la profesional que atiende ve de entrada "alergia a la acetona", "se hizo de cero la vez pasada", etc. antes de empezar el servicio.
- Probado de punta a punta: la dueña cargó una nota ("alergia a la acetona") desde la ficha → se logueó como Luciana (profesional) → al abrir un turno de esa clienta vio la nota de la dueña y agregó la suya propia ("se hizo de cero") → confirmado que Luciana no puede ver notas de turnos ajenos ni acceder al CRM general (403 en ambos casos). Datos de prueba limpiados.

Con esto, **los 3 huecos detectados en la auditoría de los audios ya están resueltos**.

### ⚠️ Alergias/advertencias generales desde el alta de la clienta
A pedido de la dueña: además del historial de notas por visita, se necesitaba un lugar para cargar lo importante **desde el momento en que se inscribe la clienta**, no solo después. De paso se encontraron y corrigieron dos bugs chicos: el campo `internalNotes` existía en la base hacía rato pero nunca estuvo expuesto en el formulario, y el campo `address` no se precargaba al editar una clienta existente (el tipo `Client` del frontend ni siquiera lo declaraba).

- **`ClientFormModal`**: nuevo campo "Alergias, cuidados especiales u otras advertencias" (mapea a `Client.internalNotes`, el mismo campo que ya existía en el modelo) — se completa opcionalmente al dar de alta o editar una clienta.
- Se muestra **destacado en amarillo, arriba de todo**, tanto en la ficha completa (`ClientDetailModal`, dueña) como en el detalle de cada turno (`AppointmentDetailModal`, ambos roles) — separado del historial de notas por visita: esto es el dato general "de siempre" (alergias, tipo de uña), mientras que el historial de notas es el registro puntual de cada visita.
- Probado de punta a punta: se cargó una clienta nueva con "Alérgica al látex..." desde el alta → quedó visible en amarillo arriba de todo en su ficha, separado de la sección de notas por visita (que arrancó vacía, como corresponde). Clienta de prueba limpiada.

### 🎨 Rediseño visual — fundación instalada (en curso, "todo de una")
Se definió la combinación **Lucide React + Sonner + Radix UI (Dialog/Select) + Tailwind Variants**, en vez de shadcn/ui tal cual (que es más una plantilla de referencia que una librería instalable) — se armaron los mismos componentes que shadcn genera, pero a medida sobre el sistema de diseño en degradé rosa/fucsia que ya existía en `index.css`, para no tener dos lenguajes visuales mezclados.

- **Instalado**: `lucide-react` (íconos), `sonner` (notificaciones toast), `@radix-ui/react-dialog`, `@radix-ui/react-select`, `class-variance-authority` + `clsx` + `tailwind-merge` (para el helper `cn()`), `tailwindcss-animate` (animaciones de entrada/salida, registrado vía `@plugin` en `index.css` — Tailwind v4 sigue soportando plugins estilo v3 así).
- **Componentes nuevos reutilizables** en `frontend/src/components/ui/`: `Modal` (reemplaza el div `fixed inset-0 bg-black/40` repetido en cada modal, con blur de fondo, animación de entrada/salida, foco atrapado y cierre con Escape vía Radix) y `Select`/`SelectItem` (reemplaza el `<select>` nativo del navegador, que se veía fuera de estilo al lado de los botones con degradé).
- **`alert()` eliminado de toda la app**: los 6 casos que quedaban (copiar alias, errores de guardado, error de descarga) ahora usan `toast.success()` / `toast.error()` de Sonner — notificaciones que aparecen y desaparecen solas arriba a la derecha, en vez de la ventana fea del navegador.
- **NavBar**: los emojis de los links (💅⚙️👤) se reemplazaron por íconos Lucide (Calendar, Users, Tags, Wallet, UserCog, MessageCircle, Settings, UserCircle, LogOut) — se ve notablemente más profesional.
- **Modales y selects ya migrados** al nuevo sistema: `ServiceFormModal`, `TransactionFormModal`, `PaymentFeesPanel`, y los selects de `CommissionsTab`, `SettingsPage` (3 selects, incluida la gestión de roles de usuario), `CampaignsTab`, `TemplatesTab`.
- De paso se corrigieron los 3 errores de TypeScript que quedaban dando vueltas (imports/variables sin usar) — el build ahora compila 100% limpio.
- Probado en navegador: el modal con el nuevo `Select` funciona correctamente (verificado interactuando por coordenadas — el click normal de la herramienta de test tuvo un problema propio de esa herramienta con la animación CSS, no un bug real de la app).

**Falta migrar** (mismo patrón, se sigue en la próxima sesión): el resto de los modales — `AppointmentModal`, `ClientFormModal`, `ProfessionalFormModal`, `CommissionRatesMatrix`, `ClientDetailModal`, `AppointmentDetailModal`, el modal de baja de `PersonalTab`, y los que quedan en `CampaignsTab`/`WhatsappPage`. El patrón ya está probado y es mecánico (envolver en `<Modal>`, cambiar `<select>` por `<Select>`), así que es cuestión de tiempo, no de diseño.

### ⏭️ Pendiente / mejoras futuras
- Terminar de migrar el resto de los modales al nuevo `Modal`/`Select` (ver arriba).
- De la auditoría de los audios, queda 1 hueco por resolver: notas de clienta por visita (hoy es un solo campo de texto general, no versionado por fecha/servicio).
- Sin borrado real de clientas (solo alta/edición) — no se pidió aún, se puede agregar si hace falta.
- Finanzas: no hay UI para editar/borrar una liquidación de comisión ya generada por error (solo marcar pagada/no pagada).
- Personal: no hay tolerancia automática de "llegada tarde" (definido así a propósito); no hay borrado de profesionales con login (solo baja lógica).
- WhatsApp: el límite/ritmo sugerido para campañas grandes (mitigación de antispam que hablamos) quedó solo como criterio manual de la dueña — no hay un tope duro en el sistema todavía.
- Nota: "Luciana Perez" sigue siendo la profesional de ejemplo del seed inicial (con login de prueba `luciana@barbynails.com`) — reemplazar por el personal real antes de producción.
- Falta: deploy real (Render + Vercel + variables de entorno de producción), y rotar la password de Supabase (pendiente desde el setup inicial).
- **Limitación conocida a revisar**: todo el sistema trata los horarios como "hora de pared" del salón guardada con sufijo `Z` (sin conversión real de huso horario) — es una simplificación válida porque el salón opera en un único huso horario fijo (Argentina, sin horario de verano), pero si en el futuro se necesita soporte multi-timezone habría que revisar esto.

## Estructura de carpetas

```
barby-nails/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   ├── src/
│   │   ├── modules/{auth,agenda,professionals,clients,catalog}/
│   │   ├── middleware/auth.ts
│   │   ├── lib/{prisma.ts,errors.ts}
│   │   ├── app.ts
│   │   └── server.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/            # client.ts (fetch+token), agenda.ts, catalog.ts, types.ts
│   │   ├── context/         # AuthContext.tsx
│   │   ├── pages/
│   │   │   ├── Login/
│   │   │   └── Agenda/      # AgendaPage, DayGrid, AppointmentModal, AppointmentDetailModal, dateUtils, statusColors
│   │   └── App.tsx
│   └── package.json
└── PROGRESS.md        # este documento
```
