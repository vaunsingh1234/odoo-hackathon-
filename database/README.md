# Database Documentation

## Overview

The Inventory Management app uses **SQLite** for offline data storage. SQLite is a lightweight, file-based database that works completely offline and stores all data locally on the device.

## Database Structure

### Users Table

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loginId TEXT UNIQUE NOT NULL,
  emailId TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
);
```

**Fields:**
- `id`: Auto-incrementing primary key
- `loginId`: Unique login identifier (6-12 characters)
- `emailId`: Unique email address
- `password`: User password (should be hashed in production)
- `createdAt`: Timestamp when user was created
- `updatedAt`: Timestamp when user was last updated

**Indexes:**
- Index on `loginId` for fast lookups
- Index on `emailId` for fast lookups

## Database Functions

All database operations are in `database/db.js`. Here are the main functions:

### User Operations

- `createUser(loginId, emailId, password)` - Create a new user
- `findUserByLoginId(loginId)` - Find user by login ID
- `findUserByEmailId(emailId)` - Find user by email
- `findUserByLoginIdAndEmailId(loginId, emailId)` - Find user for password reset
- `updateUserPassword(loginId, emailId, newPassword)` - Update user password
- `loginIdExists(loginId)` - Check if login ID exists
- `emailIdExists(emailId)` - Check if email exists
- `getAllUsers()` - Get all users (for debugging)
- `deleteUser(userId)` - Delete a user (for testing)

### Database Management

- `initDatabase()` - Initialize database and create tables
- `getDatabase()` - Get database instance
- `migrateFromAsyncStorage()` - Migrate data from old AsyncStorage format

## Migration

The app automatically migrates existing data from AsyncStorage to SQLite on first launch. This ensures existing users (like "Pakoda") are preserved.

## Usage Example

```javascript
import { findUserByLoginId, createUser } from '../database/db';

// Find a user
const user = await findUserByLoginId('Pakoda');
if (user && user.password === 'password123') {
  // Login successful
}

// Create a new user
try {
  const newUser = await createUser('newuser', 'user@example.com', 'password123');
  console.log('User created:', newUser);
} catch (error) {
  if (error.message === 'Login ID already exists') {
    console.log('Login ID taken');
  }
}
```

## Benefits of SQLite

1. **Offline First**: Works completely without internet
2. **Fast**: Indexed queries for quick lookups
3. **Reliable**: ACID compliant transactions
4. **Scalable**: Can handle thousands of records
5. **Persistent**: Data survives app restarts
6. **Structured**: Proper database schema with relationships

## Troubleshooting

### User Not Found

If you registered a user but can't log in:

1. Check if migration ran: The app migrates AsyncStorage data on first launch
2. Check database: Use `getAllUsers()` to see all users
3. Verify login ID: Make sure you're using the exact same login ID (case-sensitive)

### Database Errors

If you encounter database errors:

1. Clear app data and reinstall (this will reset the database)
2. Check console logs for specific error messages
3. Ensure database initialized: Check if `initDatabase()` was called

## Future Enhancements

- Password hashing (bcrypt/argon2)
- Database encryption
- Backup/restore functionality
- Sync with cloud database (optional)

