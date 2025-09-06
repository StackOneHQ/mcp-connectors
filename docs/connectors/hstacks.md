# HStacks Connector

Deploy and manage cloud infrastructure using hstacks.dev's API.

## Credentials

- **accessToken** (required): Your hstacks API access token from your hstacks dashboard

## Setup

No additional setup required.

## Tools

### get_hstacks_stacks_schema
Get the JSON schema that describes all hstacks Stack properties.

### get_available_hstacks_images
Get a list of all operating system images available for server deployment.

### get_available_hstacks_locations
Get a list of all locations where servers can be deployed. Optionally filter by server type.

**Parameters:**
- `serverType` (optional): Server type to filter locations (e.g., 'cax11')

### get_available_hstacks_servers
Get a list of all server types that can be deployed. Optionally filter by location.

**Parameters:**
- `location` (optional): Location to filter server types (e.g., 'nbg1')

### validate_stack
Validate a hstacks Stack JSON configuration before deployment.

**Parameters:**
- `name` (required): Unique identifier for the stack deployment
- `servers` (required): Array of server instances to deploy
- `firewalls` (required): Array of shared firewall configurations
- `volumes` (required): Array of persistent storage volumes
- `successHook` (optional): Webhook URL called on successful deployment
- `errorHook` (optional): Webhook URL called on deployment failure

### deploy_stack
Deploy a Stack to hstacks infrastructure.

**Parameters:**
- `name` (required): Unique identifier for the stack deployment
- `servers` (required): Array of server instances to deploy
- `firewalls` (required): Array of shared firewall configurations
- `volumes` (required): Array of persistent storage volumes
- `successHook` (optional): Webhook URL called on successful deployment
- `errorHook` (optional): Webhook URL called on deployment failure

### delete_stack
Delete an existing hstacks Stack.

**Parameters:**
- `stackID` (required): The stack ID to delete

### get_stack_status
Get the deployment status of a stack by its ID.

**Parameters:**
- `stackID` (required): The stack ID to check status for

## Example Usage

### Deploy a simple web server

```bash
# Deploy a single Ubuntu server with nginx in Germany
bun start --connector hstacks --credentials '{"accessToken":"your-token-here"}'
```

Then use the deploy_stack tool with:

```json
{
  "name": "my-web-server",
  "servers": [
    {
      "name": "web-server", 
      "serverType": "cpx11",
      "image": "ubuntu-22.04",
      "location": "nbg1",
      "firewalls": ["web-firewall"],
      "startScript": "#!/bin/bash\napt update\napt install -y nginx\nsystemctl start nginx\nsystemctl enable nginx"
    }
  ],
  "firewalls": [
    {
      "name": "web-firewall",
      "rules": [
        {
          "direction": "inbound",
          "protocol": "tcp", 
          "port": 80,
          "sourceIPs": ["0.0.0.0/0"],
          "description": "Allow HTTP traffic"
        }
      ]
    }
  ],
  "volumes": []
}
```

### Multi-region deployment

Deploy servers in multiple locations for geographic distribution:

```json
{
  "name": "multi-region-app",
  "servers": [
    {
      "name": "app-us",
      "serverType": "cpx11", 
      "image": "ubuntu-22.04",
      "location": "ash",
      "firewalls": ["app-firewall"]
    },
    {
      "name": "app-eu",
      "serverType": "cpx11",
      "image": "ubuntu-22.04", 
      "location": "nbg1",
      "firewalls": ["app-firewall"]
    }
  ],
  "firewalls": [
    {
      "name": "app-firewall",
      "rules": [
        {
          "direction": "inbound",
          "protocol": "tcp",
          "port": 80, 
          "sourceIPs": ["0.0.0.0/0"]
        },
        {
          "direction": "inbound",
          "protocol": "tcp",
          "port": 443,
          "sourceIPs": ["0.0.0.0/0"] 
        }
      ]
    }
  ],
  "volumes": []
}
```

## Common Server Types

- **cpx11**: 1 vCPU, 2GB RAM (shared CPU)
- **cpx21**: 3 vCPUs, 4GB RAM (shared CPU)
- **cpx31**: 2 vCPUs, 8GB RAM (shared CPU)
- **cax11**: 2 vCPUs, 4GB RAM (ARM)
- **ccx13**: 2 vCPUs, 8GB RAM (dedicated CPU)

## Common Locations

- **ash**: Ashburn, VA (US East)
- **nbg1**: Nuremberg (Germany)
- **hel1**: Helsinki (Finland)
- **fsn1**: Falkenstein (Germany)

## Getting Your Access Token

1. Sign up at [hstacks.dev](https://hstacks.dev)
2. Navigate to your dashboard
3. Generate an API access token
4. Use the token in your connector credentials