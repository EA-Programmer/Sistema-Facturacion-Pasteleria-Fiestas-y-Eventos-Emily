# Sistema de Facturacion para Pasteleria

MVP web interno para gestionar clientes, productos, pedidos, pagos y facturas de una pasteleria. La primera etapa funciona como panel administrativo; la estructura queda preparada para agregar pedidos publicos de clientes y facturacion electronica SRI en una segunda fase.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- PostgreSQL + Prisma
- Auth.js / NextAuth para login administrativo
- Resend para correos transaccionales

## Secciones iniciales

- Dashboard
- Pedidos
- Clientes
- Productos
- Facturas
- Pagos
- Reportes
- Configuracion

## Primer arranque

1. Instalar dependencias:

```bash
npm install
```

2. Crear `.env` desde `.env.example` y configurar `DATABASE_URL`.

3. Generar cliente Prisma y correr migracion:

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Levantar el servidor:

```bash
npm run dev
```

La app queda disponible normalmente en `http://localhost:3000`.

## Nota de entorno

En esta maquina Node esta instalado, pero el comando `npm` apunta a un `npm-cli.js` inexistente en `C:\Users\USER\AppData\Roaming\npm\node_modules`. Si `npm install` falla, conviene reparar Node.js/npm o habilitar otro gestor con Corepack antes de instalar dependencias.

## Siguiente fase tecnica

1. Activar Auth.js con login real de administrador.
2. Conectar formularios a PostgreSQL mediante Prisma.
3. Crear generador de PDF simple para facturas internas.
4. Enviar facturas por correo con Resend.
5. Separar modulo SRI: XML, firma electronica, autorizacion y RIDE.
