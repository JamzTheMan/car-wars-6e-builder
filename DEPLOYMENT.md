# Deployment Configuration

## Setup

Before deploying, you need to create a `.deploy.config` file with your deployment settings:

1. Copy the template file:
   ```bash
   cp .deploy.config.template .deploy.config
   ```

2. Edit `.deploy.config` and fill in your actual values:
   - `VM_SSH_CONNECTION`: Your SSH connection string (e.g., "user@server.com" or "server.com")
   - `PORTAINER_URL`: Your Portainer management URL without https:// (e.g., "portainer.example.com")
   - `REMOTE_APP_PATH`: The path on your server where the app is deployed (e.g., "/srv/cw6e-app")

3. Optionally, set up your Portainer token:
   - Create a `.portainer-token` file with your API token, OR
   - Export it as an environment variable: `export PORTAINER_TOKEN='your-token'`

## Security

- `.deploy.config` is in `.gitignore` and will NOT be committed to version control
- `.portainer-token` is also ignored and will NOT be committed
- These files contain sensitive information like server URLs and tokens

## Usage

Once configured, you can use the deployment script normally:

```bash
# Deploy without version change
./deploy.sh

# Deploy with version bump
./deploy.sh --version-patch
./deploy.sh --version-minor
./deploy.sh --version-major

# Refresh assets only
./deploy.sh --refresh-cards
./deploy.sh --refresh-vehicles
./deploy.sh --refresh
```

## Troubleshooting

### Line Ending Issues

If you get errors like `.deploy.config: line X: $'\r': command not found`, this means the file has Windows line endings (CRLF) instead of Unix line endings (LF).

**Fix from PowerShell:**
```powershell
(Get-Content .deploy.config -Raw) -replace "`r`n", "`n" | Set-Content .deploy.config -NoNewline
```

**Fix from WSL/Bash:**
```bash
dos2unix .deploy.config
```

The `.gitattributes` file in this repository ensures that `.deploy.config.template` and `deploy.sh` always use LF line endings, but manually created `.deploy.config` files may need conversion.
