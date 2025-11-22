import * as SQLite from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Database Service for Inventory Management App
 *
 * This file handles all database operations using SQLite.
 * Architecture:
 * - Main database (inventory.db): Stores user credentials and authentication
 * - Per-user databases (inventory_user_{userId}.db): Stores each user's inventory data
 */

let mainDb = null; // Main database for user credentials
const userDatabases = {}; // Cache for per-user databases

/**
 * Initialize the main database (for user credentials)
 */
export const initMainDatabase = async () => {
  try {
    mainDb = await SQLite.openDatabaseAsync("inventory_main.db");

    // Create users table (authentication only)
    await mainDb.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loginId TEXT UNIQUE NOT NULL,
        emailId TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        isEmailVerified INTEGER DEFAULT 0,
        verificationCode TEXT,
        verificationCodeExpiry TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT
      );
    `);

    // Create indexes for faster lookups
    await mainDb.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_loginId ON users(loginId);
    `);
    await mainDb.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_emailId ON users(emailId);
    `);

    // Migrate existing users table if needed
    try {
      await mainDb.execAsync(`
        ALTER TABLE users ADD COLUMN isEmailVerified INTEGER DEFAULT 1;
      `);
    } catch (error) {
      console.log("isEmailVerified column may already exist");
    }

    try {
      await mainDb.execAsync(`
        ALTER TABLE users ADD COLUMN verificationCode TEXT;
      `);
    } catch (error) {
      console.log("verificationCode column may already exist");
    }

    try {
      await mainDb.execAsync(`
        ALTER TABLE users ADD COLUMN verificationCodeExpiry TEXT;
      `);
    } catch (error) {
      console.log("verificationCodeExpiry column may already exist");
    }

    // Update existing users to be verified (for backward compatibility)
    try {
      await mainDb.execAsync(`
        UPDATE users SET isEmailVerified = 1 WHERE isEmailVerified IS NULL;
      `);
    } catch (error) {
      console.log("Error updating existing users:", error);
    }

    console.log("Main database initialized successfully");
    return mainDb;
  } catch (error) {
    console.error("Error initializing main database:", error);
    throw error;
  }
};

/**
 * Initialize a user-specific inventory database
 * @param {number} userId - User ID
 */
export const initUserDatabase = async (userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Check if database already exists in cache
    if (userDatabases[userId]) {
      return userDatabases[userId];
    }

    // Open user-specific database
    const dbName = `inventory_user_${userId}.db`;
    const userDb = await SQLite.openDatabaseAsync(dbName);

    // Create receipts table (header information)
    await userDb.execAsync(`
      CREATE TABLE IF NOT EXISTS receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference TEXT UNIQUE NOT NULL,
        receiveFrom TEXT NOT NULL,
        responsible TEXT NOT NULL,
        scheduledDate TEXT,
        toLocation TEXT,
        contact TEXT,
        status TEXT DEFAULT 'draft',
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT
      );
    `);

    // Migrate existing receipts table if needed
    try {
      // Check if old columns exist (productName, productCode, etc.)
      const tableInfo = await userDb.getAllAsync(`PRAGMA table_info(receipts)`);
      const hasReference = tableInfo.some((col) => col.name === "reference");
      const hasOldColumns = tableInfo.some((col) => col.name === "productName");

      if (hasOldColumns && !hasReference) {
        // Old table structure exists, need to migrate
        console.log("Migrating receipts table...");

        // Create new receipts table with new structure
        await userDb.execAsync(`
          CREATE TABLE IF NOT EXISTS receipts_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reference TEXT UNIQUE NOT NULL,
            receiveFrom TEXT NOT NULL,
            responsible TEXT NOT NULL,
            scheduledDate TEXT,
            toLocation TEXT,
            contact TEXT,
            status TEXT DEFAULT 'draft',
            notes TEXT,
            createdAt TEXT NOT NULL,
            updatedAt TEXT
          );
        `);

        // Create receipt_items table first
        await userDb.execAsync(`
          CREATE TABLE IF NOT EXISTS receipt_items_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            receiptId INTEGER NOT NULL,
            productName TEXT NOT NULL,
            productCode TEXT,
            quantity INTEGER NOT NULL,
            unitPrice REAL,
            totalPrice REAL,
            FOREIGN KEY (receiptId) REFERENCES receipts_new(id) ON DELETE CASCADE
          );
        `);

        // Migrate data from old table
        const oldReceipts = await userDb.getAllAsync(`SELECT * FROM receipts`);
        let receiptCounter = 1;
        for (const oldReceipt of oldReceipts) {
          // Generate reference manually
          const warehouseCode = "WH1"; // Default, can be updated later
          const reference = `${warehouseCode}/IN/${receiptCounter
            .toString()
            .padStart(4, "0")}`;
          receiptCounter++;

          await userDb.runAsync(
            `INSERT INTO receipts_new (id, reference, receiveFrom, responsible, scheduledDate, toLocation, contact, status, notes, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              oldReceipt.id,
              reference,
              oldReceipt.supplierName || "Unknown",
              "System",
              oldReceipt.expectedDate || oldReceipt.receivedDate,
              null,
              null,
              oldReceipt.status || "draft",
              oldReceipt.notes,
              oldReceipt.createdAt,
              oldReceipt.updatedAt,
            ]
          );

          await userDb.runAsync(
            `INSERT INTO receipt_items_new (receiptId, productName, productCode, quantity, unitPrice, totalPrice)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              oldReceipt.id,
              oldReceipt.productName,
              oldReceipt.productCode,
              oldReceipt.quantity || 0,
              oldReceipt.unitPrice || 0,
              oldReceipt.totalPrice || 0,
            ]
          );
        }

        // Drop old receipt_items if exists
        try {
          await userDb.execAsync(`DROP TABLE IF EXISTS receipt_items`);
        } catch (e) {
          // Ignore if doesn't exist
        }

        // Rename new receipt_items
        await userDb.execAsync(
          `ALTER TABLE receipt_items_new RENAME TO receipt_items`
        );

        // Drop old table and rename new one
        await userDb.execAsync(`DROP TABLE receipts`);
        await userDb.execAsync(`ALTER TABLE receipts_new RENAME TO receipts`);
        console.log("Receipts table migrated successfully");
      }
    } catch (error) {
      console.log("Migration check completed:", error.message);
    }

    // Create receipt_items table (products in each receipt)
    await userDb.execAsync(`
      CREATE TABLE IF NOT EXISTS receipt_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receiptId INTEGER NOT NULL,
        productName TEXT NOT NULL,
        productCode TEXT,
        quantity INTEGER NOT NULL,
        unitPrice REAL,
        totalPrice REAL,
        FOREIGN KEY (receiptId) REFERENCES receipts(id) ON DELETE CASCADE
      );
    `);

    // Create deliveries table (header information)
    await userDb.execAsync(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference TEXT UNIQUE NOT NULL,
        deliveryAddress TEXT NOT NULL,
        responsible TEXT NOT NULL,
        scheduledDate TEXT,
        operationType TEXT,
        status TEXT DEFAULT 'draft',
        fromLocation TEXT,
        toLocation TEXT,
        contact TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT
      );
    `);

    // Migration: Check if deliveries table has the new schema (has 'reference' column)
    try {
      const deliveriesTableInfo = await userDb.getAllAsync(
        `PRAGMA table_info(deliveries)`
      );
      const hasReferenceColumn = deliveriesTableInfo.some(
        (col) => col.name === "reference"
      );

      if (!hasReferenceColumn && deliveriesTableInfo.length > 0) {
        // Old schema exists, migrate to new schema
        console.log("Migrating deliveries table to new schema...");

        // Create new deliveries table with correct schema
        await userDb.execAsync(`
          CREATE TABLE IF NOT EXISTS deliveries_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reference TEXT UNIQUE NOT NULL,
            deliveryAddress TEXT NOT NULL,
            responsible TEXT NOT NULL,
            scheduledDate TEXT,
            operationType TEXT,
            status TEXT DEFAULT 'draft',
            fromLocation TEXT,
            toLocation TEXT,
            contact TEXT,
            notes TEXT,
            createdAt TEXT NOT NULL,
            updatedAt TEXT
          );
        `);

        // Create delivery_items table first
        await userDb.execAsync(`
          CREATE TABLE IF NOT EXISTS delivery_items_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deliveryId INTEGER NOT NULL,
            productName TEXT NOT NULL,
            productCode TEXT,
            quantity INTEGER NOT NULL,
            unitPrice REAL,
            totalPrice REAL,
            FOREIGN KEY (deliveryId) REFERENCES deliveries_new(id) ON DELETE CASCADE
          );
        `);

        // Migrate data from old table
        const oldDeliveries = await userDb.getAllAsync(`SELECT * FROM deliveries`);
        let deliveryCounter = 1;
        for (const oldDelivery of oldDeliveries) {
          // Generate reference manually
          const warehouseCode = "WH1"; // Default, can be updated later
          const reference = `${warehouseCode}/OUT/${deliveryCounter
            .toString()
            .padStart(4, "0")}`;
          deliveryCounter++;

          await userDb.runAsync(
            `INSERT INTO deliveries_new (id, reference, deliveryAddress, responsible, scheduledDate, operationType, status, fromLocation, toLocation, contact, notes, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              oldDelivery.id,
              reference,
              oldDelivery.address || oldDelivery.deliveryAddress || "Unknown",
              oldDelivery.responsible || "System",
              oldDelivery.scheduledDate || oldDelivery.deliveryDate || oldDelivery.dueDate,
              oldDelivery.operationType || null,
              oldDelivery.status || "draft",
              oldDelivery.fromLocation || null,
              oldDelivery.toLocation || null,
              oldDelivery.contact || null,
              oldDelivery.notes || null,
              oldDelivery.createdAt || new Date().toISOString(),
              oldDelivery.updatedAt || new Date().toISOString(),
            ]
          );

          // Migrate product data to delivery_items if it exists in old schema
          if (oldDelivery.productName) {
            await userDb.runAsync(
              `INSERT INTO delivery_items_new (deliveryId, productName, productCode, quantity, unitPrice, totalPrice)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                oldDelivery.id,
                oldDelivery.productName,
                oldDelivery.productCode || null,
                oldDelivery.quantity || 0,
                oldDelivery.unitPrice || 0,
                oldDelivery.totalPrice || (oldDelivery.quantity || 0) * (oldDelivery.unitPrice || 0),
              ]
            );
          }
        }

        // Drop old tables
        await userDb.execAsync(`DROP TABLE IF EXISTS delivery_items`);
        await userDb.execAsync(`DROP TABLE IF EXISTS deliveries`);

        // Rename new tables
        await userDb.execAsync(`ALTER TABLE delivery_items_new RENAME TO delivery_items`);
        await userDb.execAsync(`ALTER TABLE deliveries_new RENAME TO deliveries`);
        console.log("Deliveries table migrated successfully");
      }
    } catch (error) {
      console.log("Delivery migration check completed:", error.message);
    }

    // Create delivery_items table (products in each delivery)
    await userDb.execAsync(`
      CREATE TABLE IF NOT EXISTS delivery_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deliveryId INTEGER NOT NULL,
        productName TEXT NOT NULL,
        productCode TEXT,
        quantity INTEGER NOT NULL,
        unitPrice REAL,
        totalPrice REAL,
        FOREIGN KEY (deliveryId) REFERENCES deliveries(id) ON DELETE CASCADE
      );
    `);

    // Create inventory table (for storing goods/items)
    await userDb.execAsync(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        productName TEXT NOT NULL,
        productCode TEXT UNIQUE,
        category TEXT,
        quantity INTEGER NOT NULL DEFAULT 0,
        unitPrice REAL,
        totalValue REAL,
        supplierName TEXT,
        location TEXT,
        minStockLevel INTEGER DEFAULT 0,
        maxStockLevel INTEGER,
        status TEXT DEFAULT 'in_stock',
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT
      );
    `);

    // Create history table (for tracking all operations)
    await userDb.execAsync(`
      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        operation TEXT NOT NULL,
        productName TEXT NOT NULL,
        productCode TEXT,
        quantity INTEGER,
        previousQuantity INTEGER,
        newQuantity INTEGER,
        price REAL,
        relatedId INTEGER,
        description TEXT,
        createdAt TEXT NOT NULL
      );
    `);

    // Create warehouses table
    await userDb.execAsync(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        shortCode TEXT UNIQUE NOT NULL,
        address TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT
      );
    `);

    // Create locations table
    await userDb.execAsync(`
      CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        shortCode TEXT UNIQUE NOT NULL,
        warehouseId INTEGER,
        warehouseName TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT,
        FOREIGN KEY (warehouseId) REFERENCES warehouses(id)
      );
    `);

    // Create warehouses table
    await userDb.execAsync(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        shortCode TEXT UNIQUE NOT NULL,
        address TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT
      );
    `);

    // Create locations table
    await userDb.execAsync(`
      CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        shortCode TEXT UNIQUE NOT NULL,
        warehouseName TEXT,
        warehouseId INTEGER,
        createdAt TEXT NOT NULL,
        updatedAt TEXT,
        FOREIGN KEY (warehouseId) REFERENCES warehouses(id)
      );
    `);

    // Create indexes for faster queries
    await userDb.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
    `);
    await userDb.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
    `);
    await userDb.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_inventory_productCode ON inventory(productCode);
    `);
    await userDb.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
    `);
    await userDb.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_history_type ON history(type);
    `);
    await userDb.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_history_createdAt ON history(createdAt);
    `);

    // Cache the database
    userDatabases[userId] = userDb;

    console.log(`User database initialized successfully for user ${userId}`);
    return userDb;
  } catch (error) {
    console.error(
      `Error initializing user database for user ${userId}:`,
      error
    );
    throw error;
  }
};

/**
 * Get main database instance (for user credentials)
 */
export const getMainDatabase = async () => {
  if (!mainDb) {
    await initMainDatabase();
  }
  return mainDb;
};

/**
 * Get user-specific database instance
 * @param {number} userId - User ID
 */
export const getUserDatabase = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required to access user database");
  }
  return await initUserDatabase(userId);
};

/**
 * Legacy function for backward compatibility - redirects to main database
 * @deprecated Use getMainDatabase() or getUserDatabase(userId) instead
 */
export const getDatabase = async () => {
  return await getMainDatabase();
};

/**
 * Initialize both main and user databases
 */
export const initDatabase = async () => {
  await initMainDatabase();
  // User database will be initialized when user logs in
};

/**
 * User Operations (using main database)
 */

/**
 * Create a new user
 */
export const createUser = async (
  loginId,
  emailId,
  password,
  verificationCode = null
) => {
  try {
    const database = await getMainDatabase();
    const now = new Date().toISOString();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes from now

    const result = await database.runAsync(
      `INSERT INTO users (loginId, emailId, password, isEmailVerified, verificationCode, verificationCodeExpiry, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        loginId.trim(),
        emailId.trim().toLowerCase(),
        password,
        0, // Not verified yet
        verificationCode,
        expiryTime,
        now,
        now,
      ]
    );

    const userId = result.lastInsertRowId;

    // Initialize user's inventory database when user is created
    await initUserDatabase(userId);

    return {
      id: userId,
      loginId: loginId.trim(),
      emailId: emailId.trim().toLowerCase(),
      password: password,
      isEmailVerified: 0,
      verificationCode: verificationCode,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    if (error.message.includes("UNIQUE constraint failed")) {
      if (error.message.includes("loginId")) {
        throw new Error("Login ID already exists");
      } else if (error.message.includes("emailId")) {
        throw new Error("Email ID already exists");
      }
    }
    console.error("Error creating user:", error);
    throw error;
  }
};

/**
 * Verify email with code
 */
export const verifyEmail = async (emailId, code) => {
  try {
    const database = await getMainDatabase();
    const user = await findUserByEmailId(emailId);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.isEmailVerified === 1) {
      throw new Error("Email already verified");
    }

    if (!user.verificationCode || user.verificationCode !== code) {
      throw new Error("Invalid verification code");
    }

    // Check if code expired
    if (
      user.verificationCodeExpiry &&
      new Date(user.verificationCodeExpiry) < new Date()
    ) {
      throw new Error("Verification code has expired");
    }

    // Update user as verified
    const now = new Date().toISOString();
    const result = await database.runAsync(
      `UPDATE users SET isEmailVerified = 1, verificationCode = NULL, verificationCodeExpiry = NULL, updatedAt = ? WHERE emailId = ?`,
      [now, emailId.trim().toLowerCase()]
    );

    return result.changes > 0;
  } catch (error) {
    console.error("Error verifying email:", error);
    throw error;
  }
};

/**
 * Resend verification code
 */
export const resendVerificationCode = async (emailId) => {
  try {
    const database = await getMainDatabase();
    const user = await findUserByEmailId(emailId);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.isEmailVerified === 1) {
      throw new Error("Email already verified");
    }

    // Generate new code
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    await database.runAsync(
      `UPDATE users SET verificationCode = ?, verificationCodeExpiry = ?, updatedAt = ? WHERE emailId = ?`,
      [newCode, expiryTime, now, emailId.trim().toLowerCase()]
    );

    return newCode;
  } catch (error) {
    console.error("Error resending verification code:", error);
    throw error;
  }
};

/**
 * Find user by login ID
 */
export const findUserByLoginId = async (loginId) => {
  try {
    const database = await getMainDatabase();
    const result = await database.getFirstAsync(
      `SELECT * FROM users WHERE loginId = ?`,
      [loginId.trim()]
    );
    return result || null;
  } catch (error) {
    console.error("Error finding user by loginId:", error);
    throw error;
  }
};

/**
 * Find user by email ID
 */
export const findUserByEmailId = async (emailId) => {
  try {
    const database = await getMainDatabase();
    const result = await database.getFirstAsync(
      `SELECT * FROM users WHERE emailId = ?`,
      [emailId.trim().toLowerCase()]
    );
    return result || null;
  } catch (error) {
    console.error("Error finding user by emailId:", error);
    throw error;
  }
};

/**
 * Find user by login ID and email ID (for password reset)
 */
export const findUserByLoginIdAndEmailId = async (loginId, emailId) => {
  try {
    const database = await getMainDatabase();
    const result = await database.getFirstAsync(
      `SELECT * FROM users WHERE loginId = ? AND emailId = ?`,
      [loginId.trim(), emailId.trim().toLowerCase()]
    );
    return result || null;
  } catch (error) {
    console.error("Error finding user by loginId and emailId:", error);
    throw error;
  }
};

/**
 * Update user password
 */
export const updateUserPassword = async (loginId, emailId, newPassword) => {
  try {
    const database = await getMainDatabase();
    const now = new Date().toISOString();

    const result = await database.runAsync(
      `UPDATE users SET password = ?, updatedAt = ? WHERE loginId = ? AND emailId = ?`,
      [newPassword, now, loginId.trim(), emailId.trim().toLowerCase()]
    );

    return result.changes > 0;
  } catch (error) {
    console.error("Error updating password:", error);
    throw error;
  }
};

/**
 * Check if login ID exists
 */
export const loginIdExists = async (loginId) => {
  try {
    const user = await findUserByLoginId(loginId);
    return user !== null;
  } catch (error) {
    console.error("Error checking loginId:", error);
    throw error;
  }
};

/**
 * Check if email ID exists
 */
export const emailIdExists = async (emailId) => {
  try {
    const user = await findUserByEmailId(emailId);
    return user !== null;
  } catch (error) {
    console.error("Error checking emailId:", error);
    throw error;
  }
};

/**
 * Get all users (for debugging/admin purposes)
 */
export const getAllUsers = async () => {
  try {
    const database = await getMainDatabase();
    const result = await database.getAllAsync(`SELECT * FROM users`);
    return result;
  } catch (error) {
    console.error("Error getting all users:", error);
    throw error;
  }
};

/**
 * Delete user
 */
export const deleteUser = async (userId) => {
  try {
    const database = await getMainDatabase();
    const result = await database.runAsync(`DELETE FROM users WHERE id = ?`, [
      userId,
    ]);
    return result.changes > 0;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

/**
 * Inventory Operations (using user-specific database)
 */

/**
 * Generate receipt reference (WH/{WarehouseCode}/IN/{ID})
 */
export const generateReceiptReference = async (
  userId,
  warehouseCode = "WH1"
) => {
  try {
    const database = await getUserDatabase(userId);
    const lastReceipt = await database.getFirstAsync(
      `SELECT reference FROM receipts ORDER BY id DESC LIMIT 1`
    );

    let nextId = 1;
    if (lastReceipt && lastReceipt.reference) {
      const match = lastReceipt.reference.match(/\/(\d+)$/);
      if (match) {
        nextId = parseInt(match[1]) + 1;
      }
    }

    return `${warehouseCode}/IN/${nextId.toString().padStart(4, "0")}`;
  } catch (error) {
    console.error("Error generating receipt reference:", error);
    return `${warehouseCode}/IN/0001`;
  }
};

/**
 * Create a receipt (user-specific) with items
 */
export const createReceipt = async (userId, receiptData) => {
  try {
    const database = await getUserDatabase(userId);
    const now = new Date().toISOString();

    // Generate reference if not provided
    let reference = receiptData.reference;
    if (!reference) {
      const warehouses = await getWarehouses(userId);
      const warehouseCode =
        warehouses.length > 0 ? warehouses[0].shortCode : "WH1";
      reference = await generateReceiptReference(userId, warehouseCode);
    }

    // Create receipt header
    const result = await database.runAsync(
      `INSERT INTO receipts (reference, receiveFrom, responsible, scheduledDate, toLocation, contact, status, notes, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reference,
        receiptData.receiveFrom || "",
        receiptData.responsible || "",
        receiptData.scheduledDate || null,
        receiptData.toLocation || null,
        receiptData.contact || null,
        receiptData.status || "draft",
        receiptData.notes || null,
        now,
        now,
      ]
    );

    const receiptId = result.lastInsertRowId;

    // Add receipt items
    if (receiptData.items && receiptData.items.length > 0) {
      for (const item of receiptData.items) {
        const totalPrice = (item.quantity || 0) * (item.unitPrice || 0);
        await database.runAsync(
          `INSERT INTO receipt_items (receiptId, productName, productCode, quantity, unitPrice, totalPrice) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            receiptId,
            item.productName,
            item.productCode || null,
            item.quantity || 0,
            item.unitPrice || 0,
            totalPrice,
          ]
        );
      }
    }

    // Add to history
    await addHistory(userId, {
      type: "Receipt",
      operation: "Receipt Created",
      productName: receiptData.items?.[0]?.productName || "Multiple Products",
      quantity:
        receiptData.items?.reduce(
          (sum, item) => sum + (item.quantity || 0),
          0
        ) || 0,
      description: `Receipt ${reference} created`,
      relatedId: receiptId,
    });

    return receiptId;
  } catch (error) {
    console.error("Error creating receipt:", error);
    throw error;
  }
};

/**
 * Get all receipts (user-specific) with items
 */
export const getReceipts = async (userId) => {
  try {
    const database = await getUserDatabase(userId);
    const receipts = await database.getAllAsync(
      `SELECT * FROM receipts ORDER BY createdAt DESC`
    );

    // Get items for each receipt
    for (const receipt of receipts) {
      const items = await database.getAllAsync(
        `SELECT * FROM receipt_items WHERE receiptId = ?`,
        [receipt.id]
      );
      receipt.items = items || [];
    }

    return receipts;
  } catch (error) {
    console.error("Error getting receipts:", error);
    throw error;
  }
};

/**
 * Get receipt by ID with items
 */
export const getReceiptById = async (userId, receiptId) => {
  try {
    const database = await getUserDatabase(userId);
    const receipt = await database.getFirstAsync(
      `SELECT * FROM receipts WHERE id = ?`,
      [receiptId]
    );

    if (receipt) {
      const items = await database.getAllAsync(
        `SELECT * FROM receipt_items WHERE receiptId = ?`,
        [receiptId]
      );
      receipt.items = items || [];
    }

    return receipt;
  } catch (error) {
    console.error("Error getting receipt:", error);
    throw error;
  }
};

/**
 * Update receipt (user-specific)
 */
export const updateReceipt = async (userId, receiptId, receiptData) => {
  try {
    const database = await getUserDatabase(userId);
    const now = new Date().toISOString();

    // Update receipt header
    const result = await database.runAsync(
      `UPDATE receipts SET receiveFrom = ?, responsible = ?, scheduledDate = ?, toLocation = ?, contact = ?, status = ?, notes = ?, updatedAt = ? WHERE id = ?`,
      [
        receiptData.receiveFrom || "",
        receiptData.responsible || "",
        receiptData.scheduledDate || null,
        receiptData.toLocation || null,
        receiptData.contact || null,
        receiptData.status || "draft",
        receiptData.notes || null,
        now,
        receiptId,
      ]
    );

    // Update items - delete old and insert new
    if (receiptData.items) {
      await database.runAsync(`DELETE FROM receipt_items WHERE receiptId = ?`, [
        receiptId,
      ]);

      for (const item of receiptData.items) {
        const totalPrice = (item.quantity || 0) * (item.unitPrice || 0);
        await database.runAsync(
          `INSERT INTO receipt_items (receiptId, productName, productCode, quantity, unitPrice, totalPrice) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            receiptId,
            item.productName,
            item.productCode || null,
            item.quantity || 0,
            item.unitPrice || 0,
            totalPrice,
          ]
        );
      }
    }

    // Add to history
    await addHistory(userId, {
      type: "Receipt",
      operation: "Receipt Updated",
      productName: receiptData.items?.[0]?.productName || "Multiple Products",
      description: `Receipt updated`,
      relatedId: receiptId,
    });

    return result.changes > 0;
  } catch (error) {
    console.error("Error updating receipt:", error);
    throw error;
  }
};

/**
 * Update receipt status (user-specific)
 */
export const updateReceiptStatus = async (userId, receiptId, newStatus) => {
  try {
    const database = await getUserDatabase(userId);
    const now = new Date().toISOString();

    const receipt = await getReceiptById(userId, receiptId);
    if (!receipt) {
      throw new Error("Receipt not found");
    }

    // Update status
    const result = await database.runAsync(
      `UPDATE receipts SET status = ?, updatedAt = ? WHERE id = ?`,
      [newStatus, now, receiptId]
    );

    // If status is "done", update inventory
    if (newStatus === "done" && receipt.items && receipt.items.length > 0) {
      for (const item of receipt.items) {
        // Find or create inventory item
        let inventoryItem = null;
        if (item.productCode) {
          inventoryItem = await getInventoryItemByCode(
            userId,
            item.productCode
          );
        }

        if (inventoryItem) {
          // Update existing inventory
          await createOrUpdateInventoryItem(userId, {
            productCode: item.productCode,
            quantity: inventoryItem.quantity + (item.quantity || 0),
            quantityChange: item.quantity || 0,
          });
        } else {
          // Create new inventory item
          await createOrUpdateInventoryItem(userId, {
            productName: item.productName,
            productCode: item.productCode,
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            location: receipt.toLocation,
          });
        }
      }
    }

    // Add to history
    await addHistory(userId, {
      type: "Receipt",
      operation: `Receipt Status: ${newStatus}`,
      productName: receipt.items?.[0]?.productName || "Multiple Products",
      description: `Receipt status changed to ${newStatus}`,
      relatedId: receiptId,
    });

    return result.changes > 0;
  } catch (error) {
    console.error("Error updating receipt status:", error);
    throw error;
  }
};

/**
 * Delete receipt (user-specific)
 */
export const deleteReceipt = async (userId, receiptId) => {
  try {
    const database = await getUserDatabase(userId);

    // Get receipt before deleting for history
    const receipt = await getReceiptById(userId, receiptId);

    // Delete items first (CASCADE should handle this, but being explicit)
    await database.runAsync(`DELETE FROM receipt_items WHERE receiptId = ?`, [
      receiptId,
    ]);

    // Delete receipt
    const result = await database.runAsync(
      `DELETE FROM receipts WHERE id = ?`,
      [receiptId]
    );

    if (receipt && result.changes > 0) {
      await addHistory(userId, {
        type: "Receipt",
        operation: "Receipt Deleted",
        description: `Receipt ${receipt.reference} deleted`,
      });
    }

    return result.changes > 0;
  } catch (error) {
    console.error("Error deleting receipt:", error);
    throw error;
  }
};

/**
 * Generate delivery reference (WH/{WarehouseCode}/OUT/{ID})
 */
export const generateDeliveryReference = async (
  userId,
  warehouseCode = "WH1"
) => {
  try {
    const database = await getUserDatabase(userId);
    const result = await database.getFirstAsync(
      `SELECT COUNT(*) as count FROM deliveries`
    );
    const nextId = (result?.count || 0) + 1;
    return `${warehouseCode}/OUT/${nextId.toString().padStart(4, "0")}`;
  } catch (error) {
    console.error("Error generating delivery reference:", error);
    return `${warehouseCode}/OUT/0001`;
  }
};

/**
 * Create a delivery (user-specific) with items
 */
export const createDelivery = async (userId, deliveryData) => {
  try {
    const database = await getUserDatabase(userId);
    const now = new Date().toISOString();

    // Generate reference if not provided
    let reference = deliveryData.reference;
    if (!reference) {
      const warehouses = await getWarehouses(userId);
      const warehouseCode =
        warehouses.length > 0 ? warehouses[0].shortCode : "WH1";
      reference = await generateDeliveryReference(userId, warehouseCode);
    }

    // Create delivery header
    const result = await database.runAsync(
      `INSERT INTO deliveries (reference, deliveryAddress, responsible, scheduledDate, operationType, status, fromLocation, toLocation, contact, notes, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reference,
        deliveryData.deliveryAddress || "",
        deliveryData.responsible || "",
        deliveryData.scheduledDate || null,
        deliveryData.operationType || null,
        deliveryData.status || "draft",
        deliveryData.fromLocation || null,
        deliveryData.toLocation || null,
        deliveryData.contact || null,
        deliveryData.notes || null,
        now,
        now,
      ]
    );

    const deliveryId = result.lastInsertRowId;

    // Add delivery items
    if (deliveryData.items && deliveryData.items.length > 0) {
      for (const item of deliveryData.items) {
        const totalPrice = (item.quantity || 0) * (item.unitPrice || 0);
        await database.runAsync(
          `INSERT INTO delivery_items (deliveryId, productName, productCode, quantity, unitPrice, totalPrice) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            deliveryId,
            item.productName,
            item.productCode || null,
            item.quantity || 0,
            item.unitPrice || 0,
            totalPrice,
          ]
        );
      }
    }

    // Add to history
    await addHistory(userId, {
      type: "Delivery",
      operation: "Delivery Created",
      productName: deliveryData.items?.[0]?.productName || "Multiple Products",
      quantity:
        deliveryData.items?.reduce(
          (sum, item) => sum + (item.quantity || 0),
          0
        ) || 0,
      description: `Delivery ${reference} created`,
      relatedId: deliveryId,
    });

    return deliveryId;
  } catch (error) {
    console.error("Error creating delivery:", error);
    throw error;
  }
};

/**
 * Get all deliveries (user-specific) with items
 */
export const getDeliveries = async (userId) => {
  try {
    const database = await getUserDatabase(userId);
    const deliveries = await database.getAllAsync(
      `SELECT * FROM deliveries ORDER BY createdAt DESC`
    );

    // Get items for each delivery
    for (const delivery of deliveries) {
      const items = await database.getAllAsync(
        `SELECT * FROM delivery_items WHERE deliveryId = ?`,
        [delivery.id]
      );
      delivery.items = items || [];
    }

    return deliveries;
  } catch (error) {
    console.error("Error getting deliveries:", error);
    throw error;
  }
};

/**
 * Get delivery by ID with items
 */
export const getDeliveryById = async (userId, deliveryId) => {
  try {
    const database = await getUserDatabase(userId);
    const delivery = await database.getFirstAsync(
      `SELECT * FROM deliveries WHERE id = ?`,
      [deliveryId]
    );

    if (delivery) {
      const items = await database.getAllAsync(
        `SELECT * FROM delivery_items WHERE deliveryId = ?`,
        [deliveryId]
      );
      delivery.items = items || [];
    }

    return delivery;
  } catch (error) {
    console.error("Error getting delivery:", error);
    throw error;
  }
};

/**
 * Update delivery (user-specific)
 */
export const updateDelivery = async (userId, deliveryId, deliveryData) => {
  try {
    const database = await getUserDatabase(userId);
    const now = new Date().toISOString();

    // Update delivery header
    const result = await database.runAsync(
      `UPDATE deliveries SET deliveryAddress = ?, responsible = ?, scheduledDate = ?, operationType = ?, status = ?, fromLocation = ?, toLocation = ?, contact = ?, notes = ?, updatedAt = ? WHERE id = ?`,
      [
        deliveryData.deliveryAddress || "",
        deliveryData.responsible || "",
        deliveryData.scheduledDate || null,
        deliveryData.operationType || null,
        deliveryData.status || "draft",
        deliveryData.fromLocation || null,
        deliveryData.toLocation || null,
        deliveryData.contact || null,
        deliveryData.notes || null,
        now,
        deliveryId,
      ]
    );

    // Update items - delete old and insert new
    if (deliveryData.items) {
      await database.runAsync(
        `DELETE FROM delivery_items WHERE deliveryId = ?`,
        [deliveryId]
      );

      for (const item of deliveryData.items) {
        const totalPrice = (item.quantity || 0) * (item.unitPrice || 0);
        await database.runAsync(
          `INSERT INTO delivery_items (deliveryId, productName, productCode, quantity, unitPrice, totalPrice) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            deliveryId,
            item.productName,
            item.productCode || null,
            item.quantity || 0,
            item.unitPrice || 0,
            totalPrice,
          ]
        );
      }
    }

    // Add to history
    await addHistory(userId, {
      type: "Delivery",
      operation: "Delivery Updated",
      productName: deliveryData.items?.[0]?.productName || "Multiple Products",
      description: `Delivery updated`,
      relatedId: deliveryId,
    });

    return result.changes > 0;
  } catch (error) {
    console.error("Error updating delivery:", error);
    throw error;
  }
};

/**
 * Update delivery status and reduce stock when status becomes "done"
 */
export const updateDeliveryStatus = async (userId, deliveryId, newStatus) => {
  try {
    const database = await getUserDatabase(userId);
    const now = new Date().toISOString();

    const delivery = await getDeliveryById(userId, deliveryId);
    if (!delivery) {
      throw new Error("Delivery not found");
    }

    // Update status
    const result = await database.runAsync(
      `UPDATE deliveries SET status = ?, updatedAt = ? WHERE id = ?`,
      [newStatus, now, deliveryId]
    );

    // If status is "done", reduce inventory
    if (newStatus === "done" && delivery.items && delivery.items.length > 0) {
      for (const item of delivery.items) {
        // Find inventory item
        let inventoryItem = null;
        if (item.productCode) {
          inventoryItem = await getInventoryItemByCode(
            userId,
            item.productCode
          );
        }

        if (inventoryItem) {
          const newQuantity = Math.max(0, inventoryItem.quantity - (item.quantity || 0));
          // Update existing inventory
          await createOrUpdateInventoryItem(userId, {
            productCode: item.productCode,
            quantity: newQuantity,
            quantityChange: -(item.quantity || 0),
          });
        }
      }
    }

    // Add to history
    await addHistory(userId, {
      type: "Delivery",
      operation: `Delivery Status: ${newStatus}`,
      productName: delivery.items?.[0]?.productName || "Multiple Products",
      description: `Delivery status changed to ${newStatus}`,
      relatedId: deliveryId,
    });

    return result.changes > 0;
  } catch (error) {
    console.error("Error updating delivery status:", error);
    throw error;
  }
};

/**
 * Delete delivery (user-specific)
 */
export const deleteDelivery = async (userId, deliveryId) => {
  try {
    const database = await getUserDatabase(userId);

    // Get delivery before deleting for history
    const delivery = await getDeliveryById(userId, deliveryId);

    // Delete items first (CASCADE should handle this, but being explicit)
    await database.runAsync(
      `DELETE FROM delivery_items WHERE deliveryId = ?`,
      [deliveryId]
    );

    // Delete delivery
    await database.runAsync(`DELETE FROM deliveries WHERE id = ?`, [
      deliveryId,
    ]);

    // Add to history
    if (delivery) {
      await addHistory(userId, {
        type: "Delivery",
        operation: "Delivery Deleted",
        productName: delivery.items?.[0]?.productName || "Multiple Products",
        description: `Delivery ${delivery.reference} deleted`,
        relatedId: deliveryId,
      });
    }

    return true;
  } catch (error) {
    console.error("Error deleting delivery:", error);
    throw error;
  }
};

/**
 * Inventory Item Operations (user-specific)
 */

/**
 * Create or update inventory item
 */
export const createOrUpdateInventoryItem = async (userId, itemData) => {
  try {
    const database = await getUserDatabase(userId);
    const now = new Date().toISOString();

    // Check if item exists
    let existingItem = null;
    if (itemData.productCode) {
      existingItem = await database.getFirstAsync(
        `SELECT * FROM inventory WHERE productCode = ?`,
        [itemData.productCode]
      );
    }

    if (existingItem) {
      // Update existing item
      const previousQuantity = existingItem.quantity;
      const newQuantity =
        itemData.quantity !== undefined
          ? itemData.quantity
          : existingItem.quantity + (itemData.quantityChange || 0);

      const result = await database.runAsync(
        `UPDATE inventory SET productName = ?, category = ?, quantity = ?, unitPrice = ?, totalValue = ?, supplierName = ?, location = ?, minStockLevel = ?, maxStockLevel = ?, status = ?, notes = ?, updatedAt = ? WHERE id = ?`,
        [
          itemData.productName || existingItem.productName,
          itemData.category || existingItem.category,
          newQuantity,
          itemData.unitPrice !== undefined
            ? itemData.unitPrice
            : existingItem.unitPrice,
          newQuantity *
            (itemData.unitPrice !== undefined
              ? itemData.unitPrice
              : existingItem.unitPrice || 0),
          itemData.supplierName || existingItem.supplierName,
          itemData.location || existingItem.location,
          itemData.minStockLevel !== undefined
            ? itemData.minStockLevel
            : existingItem.minStockLevel,
          itemData.maxStockLevel !== undefined
            ? itemData.maxStockLevel
            : existingItem.maxStockLevel,
          itemData.status || existingItem.status,
          itemData.notes || existingItem.notes,
          now,
          existingItem.id,
        ]
      );

      // Add to history
      await addHistory(userId, {
        type: "Inventory",
        operation: "Stock Updated",
        productName: itemData.productName || existingItem.productName,
        productCode: itemData.productCode,
        previousQuantity: previousQuantity,
        newQuantity: newQuantity,
        description: `Stock updated for ${
          itemData.productName || existingItem.productName
        }`,
      });

      return existingItem.id;
    } else {
      // Create new item
      const quantity = itemData.quantity || 0;
      const unitPrice = itemData.unitPrice || 0;
      const totalValue = quantity * unitPrice;

      const result = await database.runAsync(
        `INSERT INTO inventory (productName, productCode, category, quantity, unitPrice, totalValue, supplierName, location, minStockLevel, maxStockLevel, status, notes, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemData.productName,
          itemData.productCode || null,
          itemData.category || null,
          quantity,
          unitPrice,
          totalValue,
          itemData.supplierName || null,
          itemData.location || null,
          itemData.minStockLevel || 0,
          itemData.maxStockLevel || null,
          itemData.status || "in_stock",
          itemData.notes || null,
          now,
          now,
        ]
      );

      // Add to history
      await addHistory(userId, {
        type: "Inventory",
        operation: "Item Added",
        productName: itemData.productName,
        productCode: itemData.productCode,
        quantity: quantity,
        description: `New item added: ${itemData.productName}`,
      });

      return result.lastInsertRowId;
    }
  } catch (error) {
    console.error("Error creating/updating inventory item:", error);
    throw error;
  }
};

/**
 * Get all inventory items (user-specific)
 */
export const getInventoryItems = async (userId) => {
  try {
    const database = await getUserDatabase(userId);
    return await database.getAllAsync(
      `SELECT * FROM inventory ORDER BY createdAt DESC`
    );
  } catch (error) {
    console.error("Error getting inventory items:", error);
    throw error;
  }
};

/**
 * Get inventory item by product code (user-specific)
 */
export const getInventoryItemByCode = async (userId, productCode) => {
  try {
    const database = await getUserDatabase(userId);
    return await database.getFirstAsync(
      `SELECT * FROM inventory WHERE productCode = ?`,
      [productCode]
    );
  } catch (error) {
    console.error("Error getting inventory item by code:", error);
    throw error;
  }
};

/**
 * Delete inventory item (user-specific)
 */
export const deleteInventoryItem = async (userId, itemId) => {
  try {
    const database = await getUserDatabase(userId);

    // Get item before deleting for history
    const item = await database.getFirstAsync(
      `SELECT * FROM inventory WHERE id = ?`,
      [itemId]
    );

    const result = await database.runAsync(
      `DELETE FROM inventory WHERE id = ?`,
      [itemId]
    );

    if (item && result.changes > 0) {
      // Add to history
      await addHistory(userId, {
        type: "Inventory",
        operation: "Item Deleted",
        productName: item.productName,
        productCode: item.productCode,
        description: `Item deleted: ${item.productName}`,
      });
    }

    return result.changes > 0;
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    throw error;
  }
};

/**
 * History Operations (user-specific)
 */

/**
 * Add history entry (user-specific)
 */
export const addHistory = async (userId, historyData) => {
  try {
    const database = await getUserDatabase(userId);
    const now = new Date().toISOString();

    await database.runAsync(
      `INSERT INTO history (type, operation, productName, productCode, quantity, previousQuantity, newQuantity, price, relatedId, description, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        historyData.type,
        historyData.operation,
        historyData.productName,
        historyData.productCode || null,
        historyData.quantity || null,
        historyData.previousQuantity || null,
        historyData.newQuantity || null,
        historyData.price || null,
        historyData.relatedId || null,
        historyData.description || null,
        now,
      ]
    );
  } catch (error) {
    console.error("Error adding history:", error);
    throw error;
  }
};

/**
 * Get history (user-specific)
 */
export const getHistory = async (userId) => {
  try {
    const database = await getUserDatabase(userId);
    return await database.getAllAsync(
      `SELECT * FROM history ORDER BY createdAt DESC`
    );
  } catch (error) {
    console.error("Error getting history:", error);
    throw error;
  }
};

/**
 * Warehouse Operations (user-specific)
 */

/**
 * Create warehouse
 */
export const createWarehouse = async (userId, warehouseData) => {
  try {
    const database = await getUserDatabase(userId);
    const now = new Date().toISOString();

    const result = await database.runAsync(
      `INSERT INTO warehouses (name, shortCode, address, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        warehouseData.name.trim(),
        warehouseData.shortCode.trim().toUpperCase(),
        warehouseData.address?.trim() || null,
        now,
        now,
      ]
    );

    return result.lastInsertRowId;
  } catch (error) {
    if (error.message.includes("UNIQUE constraint failed")) {
      throw new Error("Short code already exists");
    }
    console.error("Error creating warehouse:", error);
    throw error;
  }
};

/**
 * Get all warehouses (user-specific)
 */
export const getWarehouses = async (userId) => {
  try {
    const database = await getUserDatabase(userId);
    return await database.getAllAsync(
      `SELECT * FROM warehouses ORDER BY createdAt DESC`
    );
  } catch (error) {
    console.error("Error getting warehouses:", error);
    throw error;
  }
};

/**
 * Update warehouse
 */
export const updateWarehouse = async (userId, warehouseId, warehouseData) => {
  try {
    const database = await getUserDatabase(userId);
    const now = new Date().toISOString();

    const result = await database.runAsync(
      `UPDATE warehouses SET name = ?, shortCode = ?, address = ?, updatedAt = ? WHERE id = ?`,
      [
        warehouseData.name.trim(),
        warehouseData.shortCode.trim().toUpperCase(),
        warehouseData.address?.trim() || null,
        now,
        warehouseId,
      ]
    );

    return result.changes > 0;
  } catch (error) {
    if (error.message.includes("UNIQUE constraint failed")) {
      throw new Error("Short code already exists");
    }
    console.error("Error updating warehouse:", error);
    throw error;
  }
};

/**
 * Delete warehouse
 */
export const deleteWarehouse = async (userId, warehouseId) => {
  try {
    const database = await getUserDatabase(userId);
    const result = await database.runAsync(
      `DELETE FROM warehouses WHERE id = ?`,
      [warehouseId]
    );
    return result.changes > 0;
  } catch (error) {
    console.error("Error deleting warehouse:", error);
    throw error;
  }
};

/**
 * Location Operations (user-specific)
 */

/**
 * Create location
 */
export const createLocation = async (userId, locationData) => {
  try {
    const database = await getUserDatabase(userId);
    const now = new Date().toISOString();

    // Get warehouse ID if warehouse name is provided
    let warehouseId = null;
    if (locationData.warehouseName) {
      const warehouse = await database.getFirstAsync(
        `SELECT id FROM warehouses WHERE name = ?`,
        [locationData.warehouseName.trim()]
      );
      if (warehouse) {
        warehouseId = warehouse.id;
      }
    }

    const result = await database.runAsync(
      `INSERT INTO locations (name, shortCode, warehouseName, warehouseId, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        locationData.name.trim(),
        locationData.shortCode.trim().toUpperCase(),
        locationData.warehouseName?.trim() || null,
        warehouseId,
        now,
        now,
      ]
    );

    return result.lastInsertRowId;
  } catch (error) {
    if (error.message.includes("UNIQUE constraint failed")) {
      throw new Error("Short code already exists");
    }
    console.error("Error creating location:", error);
    throw error;
  }
};

/**
 * Get all locations (user-specific)
 */
export const getLocations = async (userId) => {
  try {
    const database = await getUserDatabase(userId);
    return await database.getAllAsync(
      `SELECT * FROM locations ORDER BY createdAt DESC`
    );
  } catch (error) {
    console.error("Error getting locations:", error);
    throw error;
  }
};

/**
 * Update location
 */
export const updateLocation = async (userId, locationId, locationData) => {
  try {
    const database = await getUserDatabase(userId);
    const now = new Date().toISOString();

    // Get warehouse ID if warehouse name is provided
    let warehouseId = null;
    if (locationData.warehouseName) {
      const warehouse = await database.getFirstAsync(
        `SELECT id FROM warehouses WHERE name = ?`,
        [locationData.warehouseName.trim()]
      );
      if (warehouse) {
        warehouseId = warehouse.id;
      }
    }

    const result = await database.runAsync(
      `UPDATE locations SET name = ?, shortCode = ?, warehouseName = ?, warehouseId = ?, updatedAt = ? WHERE id = ?`,
      [
        locationData.name.trim(),
        locationData.shortCode.trim().toUpperCase(),
        locationData.warehouseName?.trim() || null,
        warehouseId,
        now,
        locationId,
      ]
    );

    return result.changes > 0;
  } catch (error) {
    if (error.message.includes("UNIQUE constraint failed")) {
      throw new Error("Short code already exists");
    }
    console.error("Error updating location:", error);
    throw error;
  }
};

/**
 * Delete location
 */
export const deleteLocation = async (userId, locationId) => {
  try {
    const database = await getUserDatabase(userId);
    const result = await database.runAsync(
      `DELETE FROM locations WHERE id = ?`,
      [locationId]
    );
    return result.changes > 0;
  } catch (error) {
    console.error("Error deleting location:", error);
    throw error;
  }
};

/**
 * Migration from AsyncStorage (for backward compatibility)
 */
export const migrateFromAsyncStorage = async () => {
  try {
    const usersJson = await AsyncStorage.getItem("users");

    if (!usersJson) {
      console.log("No AsyncStorage data to migrate");
      return;
    }

    const users = JSON.parse(usersJson);

    // Check if users already exist in database
    const existingUsers = await getAllUsers();
    if (existingUsers.length > 0) {
      console.log("Database already has users, skipping migration");
      return;
    }

    const database = await getMainDatabase();
    let migratedCount = 0;

    for (const user of users) {
      try {
        await database.runAsync(
          `INSERT INTO users (loginId, emailId, password, isEmailVerified, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            user.loginId,
            user.emailId,
            user.password,
            1, // Mark as verified for migrated users
            new Date().toISOString(),
            new Date().toISOString(),
          ]
        );
        migratedCount++;
      } catch (error) {
        console.error(`Error migrating user ${user.loginId}:`, error);
      }
    }

    console.log(`Migration completed: ${migratedCount} users migrated`);
  } catch (error) {
    console.error("Error during migration:", error);
    // Don't throw - allow app to continue even if migration fails
  }
};
