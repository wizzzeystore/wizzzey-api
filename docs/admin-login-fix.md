# Admin Login Permission Fix

## Problem
When trying to login with admin credentials, you may encounter this error:
```json
{
    "type": "ERROR",
    "message": "Cannot create field 'canManageBrands' in element {permissions: [ \"general:view_dashboard\", \"product:view_list\", ... ]}",
    "data": null
}
```

This happens because the admin user was created before the new permission system was implemented, and the user document has the old string-based permission structure instead of the new boolean-based structure.

## Solution

### Option 1: Migrate Existing Admin Users (Recommended)

Run the migration script to update existing admin users:

```bash
npm run migrate-admin
```

This script will:
- Find all existing admin users
- Update their permission structure to match the new schema
- Set all admin permissions to `true`

### Option 2: Create a New Admin User

If you prefer to create a fresh admin user:

```bash
node create-admin.js <email> <password>
```

Example:
```bash
node create-admin.js admin@example.com mypassword123
```

### Option 3: Manual Database Update

If you prefer to manually update the database, you can run this MongoDB command:

```javascript
db.users.updateMany(
  { role: "Admin" },
  {
    $set: {
      permissions: {
        canManageUsers: true,
        canManageProducts: true,
        canManageOrders: true,
        canManageInventory: true,
        canManageBrands: true,
        canViewAnalytics: true
      }
    }
  }
)
```

## Permission Structure

The new permission system uses boolean flags instead of string arrays:

### Old Structure (String Array)
```javascript
permissions: [
  "general:view_dashboard",
  "product:view_list",
  "product:create",
  // ... more strings
]
```

### New Structure (Boolean Object)
```javascript
permissions: {
  canManageUsers: true,
  canManageProducts: true,
  canManageOrders: true,
  canManageInventory: true,
  canManageBrands: true,
  canViewAnalytics: true
}
```

## Available Permissions

- `canManageUsers` - Can manage user accounts and roles
- `canManageProducts` - Can create, edit, and delete products
- `canManageOrders` - Can view and manage orders
- `canManageInventory` - Can manage inventory levels
- `canManageBrands` - Can manage brand information
- `canViewAnalytics` - Can view analytics and reports

## Role-Based Default Permissions

The system automatically sets permissions based on user roles:

### Admin
All permissions set to `true`

### Moderator
- `canManageProducts`: true
- `canManageOrders`: true
- `canManageInventory`: true
- `canViewAnalytics`: true
- Others: false

### BrandPartner
- `canManageOrders`: true
- Others: false

### Customer
All permissions set to `false`

## Verification

After running the migration, you can verify the fix by:

1. Trying to login with admin credentials
2. Checking the user document in the database
3. Verifying that the permissions object has the correct structure

## Troubleshooting

### Migration Script Fails
- Ensure MongoDB is running
- Check that the MONGODB_URI environment variable is set correctly
- Verify database connection permissions

### Still Getting Permission Errors
- Check if there are multiple admin users that need migration
- Verify the user document structure in the database
- Ensure the User model schema matches the expected structure

### Creating New Admin Fails
- Check email format validity
- Ensure password meets minimum length requirements
- Verify that the email is not already in use

## Support

If you continue to experience issues after following these steps, please check:
1. Database connection status
2. User model schema consistency
3. Environment variable configuration
4. MongoDB version compatibility 