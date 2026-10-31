# Deploy Spray Sales directly on Cloudflare Workers

The existing Sites deployment stays separate. A direct Cloudflare deployment uses a new database; it does not import orders from Sites.

1. In Cloudflare, create a D1 database named `spray-sales-orders`. Copy its database ID.
2. Connect `Lukusha/Spray-Sales`, branch `main`, to a Worker named `spray-sales`.
3. Enter these build settings:

| Field | Value |
| --- | --- |
| Build command | `npm run build:cloudflare` |
| Deploy command | `npm run deploy:cloudflare` |
| Root path | `/` |
| Preview builds | Off for the initial setup |
| Protect with Cloudflare Access | Off for the public storefront |
| Build variable | `D1_DATABASE_ID` = the ID copied in step 1 |

Node 22 is selected by `.node-version`. The Worker name defaults to `spray-sales`; if the name in the dashboard differs, add a build variable `WORKER_NAME` with the exact dashboard name. The database name defaults to `spray-sales-orders`; override it with `D1_DATABASE_NAME` if using a different database name.

Use a Cloudflare build token authorized to deploy Workers and apply D1 migrations in the target account. Do not put an API token in source or send it in chat. Cloudflare can generate a token during setup; ensure it also has D1 edit access if migration execution reports a permissions failure.

The build script validates the database ID and replaces the Sites placeholder binding in generated deployment output. The deploy script applies only pending migrations and then deploys the built Worker. No database or Worker is created by the build script itself.

## Private order inbox

After the first deployment, open the Worker settings and add an encrypted **runtime secret** named `ADMIN_PASSWORD`, using a password-manager-generated password of at least 20 characters. Save/deploy the secret as Cloudflare requests. Do not enter this password in a public build variable.

Open `/merchant`. Username: `admin`. Password: the value you saved as `ADMIN_PASSWORD`. Until that secret is configured, the inbox is locked. Customers never need this login and can continue using guest checkout.

Direct Cloudflare hosting explicitly ignores Sites visitor identity headers for merchant access. The `AUTH_PROVIDER=cloudflare` runtime variable is written into generated configuration by the standalone build script. Normal Sites builds keep their existing owner sign-in behavior.

## Order notifications

Orders are stored in D1 together with separate email/SMS alert jobs. See [NOTIFICATIONS.md](./NOTIFICATIONS.md) for the two email destinations, phone destination, required provider configuration and delivery status meanings. A five-minute scheduled handler retries eligible jobs. Sending credentials are runtime secrets; they are not build variables.

## Preview builds

Leave preview builds off initially, so a preview cannot accept orders into the live database. Setting a preview deploy command alone does not create a separate database. Preview support requires a separate Worker/database configuration; configure that before enabling preview builds.

Official references: [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [Worker runtime secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
