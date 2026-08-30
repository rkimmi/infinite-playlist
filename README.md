# Run Application

```bash
pnpm run dev-watch
```

# Run DB

```bash
docker compose up -d
```

## Apply migrations

Once the db is running, run from the /packages/db directory

```bash
pnpm run db:migrate
```

# Run with https SSL cert for apple auth

Apple OAuth requires a valid non localhost url. To test with apple OAuth, use https mode: with `pnpm run dev:https` or `pnpm run dev-watch:https`. This requires mapping a custom domain name to your localhost IP, and setting up SSL certs:

## Update etc/hosts file

```bash
sudo vi /etc/hosts
```

Paste in the following:

```
##
# Mixtaped localhost -> domain mapping for auth providers
##
127.0.0.1       dev.mixtaped.io
```

`dev.mixtaped.io` is registered for our oauth providers.

Save file
-> esc
-> `:x` + enter to write file and close

## Create SSL certificate for HTTPS

Install `mkcert`

```bash
brew install mkcert nss
```

Set up mkcert

```bash
mkcert -install
```

Note expiry date.

Create certificate from project directory `infinite-playlist/apps/web` directory

```bash
mkcert dev.mixtaped.io
```

## Check references to certs

You'll see in the `/apps/web/package.json` the inclusion of these certs in the `dev:https` scripts:

`--hostname 0.0.0.0 --experimental-https --experimental-https-key ./dev.mixtaped.io-key.pem --experimental-https-cert ./mixtaped.test.pem"`

## Run app

When running app in https mode, target `https://dev.mixtaped.io:3000` rather than `localhost:3000`. Noteyour browser should complain about an insecure site here for local development, due to an unrecognised issuer for our SSL certs (handmade local Certificate Authority). Accept allow anyway, or whitelist in your browser settings.
