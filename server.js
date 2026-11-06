require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Middleware: Verify user login token
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Please log in first."
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                message: "Invalid or expired login session. Please log in again."
            });
        }

        req.user = user;
        next();
    });
}

// Middleware: Allow admin accounts only
function requireAdmin(req, res, next) {
    if (req.user.role !== "admin") {
        return res.status(403).json({
            message: "Admin access required."
        });
    }

    next();
}

// Middleware: Allow seller accounts only
function requireSeller(req, res, next) {
    if (req.user.role !== "seller") {
        return res.status(403).json({
            message: "Only sellers can manage product listings."
        });
    }

    next();
}

const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "thriftmatch",
    ssl: process.env.DB_HOST ? {
        ca: fs.readFileSync("/etc/secrets/ca.pem"),
        rejectUnauthorized: true
    } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, connection) => {
    if (err) {
        console.error("MySQL connection failed:", err.message);
        return;
    }

    console.log("Connected to ThriftMatch MySQL database!");
    connection.release();
});

app.get("/api/admin/check", authenticateToken, requireAdmin, (req, res) => {
    res.json({
        message: "Admin access verified."
    });
});


/* ===== ADMIN: VIEW USERS ===== */
app.get("/api/admin/users", authenticateToken, requireAdmin, (req, res) => {
    const sql = `
        SELECT id, full_name, email, role
        FROM users
        ORDER BY id DESC
    `;

    db.query(sql, (err, users) => {
        if (err) {
            console.error("Error fetching admin users:", err.message);

            return res.status(500).json({
                message: "Failed to fetch users."
            });
        }

        res.json(users);
    });
});

/* ===== ADMIN: DASHBOARD SUMMARY ===== */
app.get("/api/admin/summary", authenticateToken, requireAdmin, (req, res) => {
    const sql = `
        SELECT
            (SELECT COUNT(*) FROM users) AS total_accounts,
            (SELECT COUNT(*) FROM users
                WHERE role = 'customer') AS total_customers,
            (SELECT COUNT(*) FROM users
                WHERE role = 'seller') AS total_sellers,
            (SELECT COUNT(*) FROM users
                WHERE role IN ('customer', 'seller')) AS total_users,
            (SELECT COUNT(*) FROM products) AS total_products
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching admin summary:", err.message);

            return res.status(500).json({
                message: "Failed to fetch dashboard summary."
            });
        }

        res.json(results[0]);
    });
});

 // GET: Display all products with seller information and images
app.get("/api/products", (req, res) => {
    const sql = `
        SELECT
            products.*,
            users.full_name AS seller_name
        FROM products
        LEFT JOIN users
            ON products.user_id = users.id
    `;

    db.query(sql, (err, products) => {
        if (err) {
            console.error("Error fetching products:", err.message);
            return res.status(500).json({
                message: "Failed to fetch products."
            });
        }

        if (products.length === 0) {
            return res.json([]);
        }

        const productIds = products.map(product => product.id);
        const placeholders = productIds.map(() => "?").join(", ");

        const imageSql = `
            SELECT product_id, image_url
            FROM product_images
            WHERE product_id IN (${placeholders})
            ORDER BY sort_order ASC, id ASC
        `;

        db.query(imageSql, productIds, (err, images) => {
            if (err) {
                console.error("Error fetching product images:", err.message);
                return res.status(500).json({
                    message: "Failed to fetch product images."
                });
            }

            const imagesByProduct = {};

            images.forEach(image => {
                if (!imagesByProduct[image.product_id]) {
                    imagesByProduct[image.product_id] = [];
                }

                imagesByProduct[image.product_id].push(image.image_url);
            });

            const productsWithImages = products.map(product => ({
                ...product,
                image_urls: imagesByProduct[product.id] || (
                    product.image_url ? [product.image_url] : []
                )
            }));

            res.json(productsWithImages);
        });
    });
});


/* ===== ADMIN: VIEW PRODUCTS ===== */
app.get("/api/admin/products", authenticateToken, requireAdmin, (req, res) => {
    const sql = `
        SELECT
            products.*,
            users.full_name AS seller_name
        FROM products
        LEFT JOIN users
            ON products.user_id = users.id
        ORDER BY products.id DESC
    `;

    db.query(sql, (err, products) => {
        if (err) {
            console.error("Error fetching admin products:", err.message);

            return res.status(500).json({
                message: "Failed to fetch products."
            });
        }

        // Check if there are products.
        if (products.length === 0) {
            return res.json([]);
        }

        // Get all product IDs.
        const productIds = products.map(product => product.id);

        // Fetch multiple images for each product.
        const imageSql = `
            SELECT product_id, image_url, sort_order
            FROM product_images
            WHERE product_id IN (?)
            ORDER BY sort_order ASC
        `;

        db.query(imageSql, [productIds], (err, images) => {
            if (err) {
                console.error("Error fetching admin product images:", err.message);

                return res.status(500).json({
                    message: "Failed to fetch product images."
                });
            }

            // Group images by product ID.
            const imagesByProduct = {};

            images.forEach(image => {
                if (!imagesByProduct[image.product_id]) {
                    imagesByProduct[image.product_id] = [];
                }

                imagesByProduct[image.product_id].push(image.image_url);
            });

            // Attach images to each product.
            const productsWithImages = products.map(product => ({
                ...product,
                image_urls: imagesByProduct[product.id] || (
                    product.image_url ? [product.image_url] : []
                )
            }));

            res.json(productsWithImages);
        });
    });
});


 
 // POST: Add a product
app.post("/api/products", authenticateToken, requireSeller, (req, res) => {
    const {
        product_name,
        price,
        size,
        color,
        style,
        description,
        availability,
        image_url,
        image_urls
    } = req.body;

    if (
        !product_name?.trim() ||
        price === undefined ||
        price === null ||
        price === "" ||
        !Number.isFinite(Number(price)) ||
        Number(price) <= 0 ||
        !size ||
        !color?.trim() ||
        !style ||
        !description?.trim()
    ) {
        return res.status(400).json({
            message: "Please complete all product fields correctly."
        });
    }

    let productImages = [];

    if (image_urls !== undefined) {
        if (!Array.isArray(image_urls)) {
            return res.status(400).json({
                message: "Images must be provided as a list."
            });
        }

        if (image_urls.length > 10) {
            return res.status(400).json({
                message: "Maximum of 10 images per product."
            });
        }

        if (
            image_urls.some(url =>
                typeof url !== "string" || !url.trim()
            )
        ) {
            return res.status(400).json({
                message: "Please provide valid image URLs."
            });
        }

        productImages = image_urls.map(url => url.trim());
    } else if (typeof image_url === "string" && image_url.trim()) {
        productImages = [image_url.trim()];
    } else if (
        image_url !== undefined &&
        image_url !== null &&
        typeof image_url !== "string"
    ) {
        return res.status(400).json({
            message: "Please provide a valid image URL."
        });
    }

    const primaryImage = productImages[0] || null;

    // Get an individual connection from the pool
    db.getConnection((err, connection) => {
        if (err) {
            console.error("Database connection error:", err.message);
            return res.status(500).json({
                message: "Failed to connect to database."
            });
        }

        connection.beginTransaction(err => {
            if (err) {
                console.error("Transaction error:", err.message);
                connection.release();

                return res.status(500).json({
                    message: "Failed to start product save."
                });
            }

            const sql = `
                INSERT INTO products
                (product_name, price, size, color, style, description, availability, image_url, user_id)
                VALUES (?, ?, ?, ?, ?, ?, 'Available', ?, ?)
            `;

            const values = [
                product_name.trim(),
                Number(price),
                size,
                color.trim(),
                style,
                description.trim(),
                primaryImage,
                req.user.id
            ];

            connection.query(sql, values, (err, result) => {
                if (err) {
                    console.error("Error adding product:", err.message);

                    return connection.rollback(() => {
                        connection.release();

                        res.status(500).json({
                            message: "Failed to save product."
                        });
                    });
                }

                const productId = result.insertId;

                const saveProductImages = () => {
                    if (productImages.length === 0) {
                        return commitProduct();
                    }

                    const imageValues = productImages.map((url, index) => [
                        productId,
                        url,
                        index + 1
                    ]);

                    const imageSql = `
                        INSERT INTO product_images
                        (product_id, image_url, sort_order)
                        VALUES ?
                    `;

                    connection.query(imageSql, [imageValues], err => {
                        if (err) {
                            console.error(
                                "Error saving product images:",
                                err.message
                            );

                            return connection.rollback(() => {
                                connection.release();

                                res.status(500).json({
                                    message: "Failed to save product images."
                                });
                            });
                        }

                        commitProduct();
                    });
                };

                const commitProduct = () => {
                    connection.commit(err => {
                        if (err) {
                            console.error("Commit error:", err.message);

                            return connection.rollback(() => {
                                connection.release();

                                res.status(500).json({
                                    message: "Failed to save product."
                                });
                            });
                        }

                        connection.release();

                        res.status(201).json({
                            message: "Product added successfully!",
                            productId,
                            imageCount: productImages.length
                        });
                    });
                };

                saveProductImages();
            });
        });
    });
});



 // PUT: Update a product
app.put("/api/products/:id", authenticateToken, requireSeller, (req, res) => {
    const productId = Number(req.params.id);

   const {
    product_name,
    price,
    size,
    color,
    style,
    description,
    availability,
    image_url,
    image_urls
} = req.body;

    if (
        !Number.isInteger(productId) ||
        productId <= 0 ||
        !product_name?.trim() ||
        price === undefined ||
        price === null ||
        price === "" ||
        !Number.isFinite(Number(price)) ||
        Number(price) <= 0 ||
        !size ||
        !color?.trim() ||
        !style ||
        !description?.trim() ||
        !["Available", "Pending", "Sold"].includes(availability)
    ) {
        return res.status(400).json({
            message: "Please provide valid product information."
        });
    }

    let productImages = [];

    if (image_urls !== undefined) {
        if (
            !Array.isArray(image_urls) ||
            image_urls.length > 10 ||
            image_urls.some(url =>
                typeof url !== "string" || !url.trim()
            )
        ) {
            return res.status(400).json({
                message: "Please provide a valid list of up to 10 image URLs."
            });
        }

        productImages = image_urls.map(url => url.trim());
    } else if (typeof image_url === "string" && image_url.trim()) {
        productImages = [image_url.trim()];
    } else if (
        image_url !== undefined &&
        image_url !== null &&
        typeof image_url !== "string"
    ) {
        return res.status(400).json({
            message: "Please provide a valid image URL."
        });
    }

    const primaryImage = productImages[0] || null;

        db.getConnection((err, connection) => {
        if (err) {
            console.error("Database connection error:", err.message);

            return res.status(500).json({
                message: "Failed to connect to database."
            });
        }

        connection.beginTransaction(err => {
            if (err) {
                console.error("Transaction error:", err.message);
                connection.release();

                return res.status(500).json({
                    message: "Failed to start product update."
                });
            }

            const rollbackAndRespond = (status, message) => {
                connection.rollback(() => {
                    connection.release();

                    res.status(status).json({
                        message
                    });
                });
            };

            const sql = `
                UPDATE products
                SET product_name = ?,
                    price = ?,
                    size = ?,
                    color = ?,
                    style = ?,
                    description = ?,
                    availability = ?,
                    image_url = ?
                WHERE id = ? AND user_id = ?
            `;

            const values = [
                product_name.trim(),
                Number(price),
                size,
                color.trim(),
                style,
                description.trim(),
                availability,
                primaryImage,
                productId,
                req.user.id
            ];

            connection.query(sql, values, (err, result) => {
                if (err) {
                    console.error("Error updating product:", err.message);

                    return rollbackAndRespond(
                        500,
                        "Failed to update product."
                    );
                }

                if (result.affectedRows === 0) {
                    return rollbackAndRespond(
                        404,
                        "Product not found or you do not own it."
                    );
                }

                connection.query(
                    "DELETE FROM product_images WHERE product_id = ?",
                    [productId],
                    err => {
                        if (err) {
                            console.error(
                                "Error replacing images:",
                                err.message
                            );

                            return rollbackAndRespond(
                                500,
                                "Failed to update product images."
                            );
                        }

                        if (productImages.length === 0) {
                            return connection.commit(err => {
                                if (err) {
                                    console.error(
                                        "Commit error:",
                                        err.message
                                    );

                                    return rollbackAndRespond(
                                        500,
                                        "Failed to update product."
                                    );
                                }

                                connection.release();

                                return res.json({
                                    message: "Product updated successfully!",
                                    imageCount: 0
                                });
                            });
                        }

                        const imageValues = productImages.map(
                            (url, index) => [
                                productId,
                                url,
                                index + 1
                            ]
                        );

                        const imageSql = `
                            INSERT INTO product_images
                            (product_id, image_url, sort_order)
                            VALUES ?
                        `;

                        connection.query(
                            imageSql,
                            [imageValues],
                            err => {
                                if (err) {
                                    console.error(
                                        "Error saving images:",
                                        err.message
                                    );

                                    return rollbackAndRespond(
                                        500,
                                        "Failed to update product images."
                                    );
                                }

                                connection.commit(err => {
                                    if (err) {
                                        console.error(
                                            "Commit error:",
                                            err.message
                                        );

                                        return rollbackAndRespond(
                                            500,
                                            "Failed to update product."
                                        );
                                    }

                                    connection.release();

                                    return res.json({
                                        message: "Product updated successfully!",
                                        imageCount: productImages.length
                                    });
                                });
                            }
                        );
                    }
                );
            });
        });
    });
});

// Test API
app.get("/api/test", (req, res) => {
    res.json({
        message: "ThriftMatch API is working!"
    });
});

 // DELETE: Delete a product
app.delete("/api/products/:id", authenticateToken, requireSeller, (req, res) => {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({
            message: "Invalid product ID."
        });
    }

   const sql = "DELETE FROM products WHERE id = ? AND user_id = ?";

    db.query(sql, [productId, req.user.id], (err, result) => {
        if (err) {
            console.error("Error deleting product:", err.message);
            return res.status(500).json({
                message: "Failed to delete product."
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        res.json({
            message: "Product deleted successfully!"
        });
    });
});

// ADMIN: Delete a product
app.delete("/api/admin/products/:id", authenticateToken, requireAdmin, (req, res) => {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({
            message: "Invalid product ID."
        });
    }

    const sql = "DELETE FROM products WHERE id = ?";

    db.query(sql, [productId], (err, result) => {
        if (err) {
            console.error("Admin delete product error:", err.message);
            return res.status(500).json({
                message: "Failed to delete product."
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        res.json({
            message: "Product deleted successfully by admin!"
        });
    });
});


// POST: Register a new user
app.post("/api/register", async (req, res) => {
    const { full_name, email, password } = req.body;
    const role = req.body.role || "customer";

    if (
        !full_name?.trim() ||
        !email?.trim() ||
        typeof password !== "string" ||
        password.length < 8
    ) {
        return res.status(400).json({
            message: "Enter your name, email, and a password with at least 8 characters."
        });
    }

    if (!["customer", "seller"].includes(role)) {
        return res.status(400).json({
            message: "Invalid account type."
        });
    }

    const cleanName = full_name.trim();
    const cleanEmail = email.trim().toLowerCase();

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users (full_name, email, password, role)
            VALUES (?, ?, ?, ?)
        `;

        db.query(
            sql,
            [cleanName, cleanEmail, hashedPassword, role],
            (err, result) => {
                if (err) {
                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(409).json({
                            message: "This email is already registered."
                        });
                    }

                    console.error("Registration error:", err.message);

                    return res.status(500).json({
                        message: "Registration failed."
                    });
                }

                res.status(201).json({
                    message: "Registration successful!",
                    userId: result.insertId
                });
            }
        );
    } catch (err) {
        console.error("Password hashing error:", err.message);

        res.status(500).json({
            message: "Registration failed."
        });
    }
});


// POST: Login
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    if (
        typeof email !== "string" ||
        !email.trim() ||
        typeof password !== "string" ||
        !password
    ) {
        return res.status(400).json({
            message: "Email and password are required."
        });
    }

    const cleanEmail = email.trim().toLowerCase();

   const sql = `
    SELECT id, full_name, email, password, role
    FROM users
    WHERE email = ?
    LIMIT 1
`;

    db.query(sql, [cleanEmail], async (err, results) => {
        if (err) {
            console.error("Login database error:", err.message);

            return res.status(500).json({
                message: "Login failed."
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const user = results[0];

        try {
            const passwordMatches = await bcrypt.compare(
                password,
                user.password
            );

            console.log("Admin login password matches:", passwordMatches);

            if (!passwordMatches) {
                return res.status(401).json({
                    message: "Invalid email or password."
                });
            }

            const secret = process.env.JWT_SECRET;

            if (!secret) {
                console.error("JWT_SECRET is not configured.");

                return res.status(500).json({
                    message: "Login is not configured correctly."
                });
            }

           const token = jwt.sign(
    {
        id: user.id,
        email: user.email,
        role: user.role
    },
    secret,
    { expiresIn: "2h" }
);

            res.json({
                message: "Login successful!",
                token,
               user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
            });
        } catch (error) {
            console.error("Login error:", error.message);

            res.status(500).json({
                message: "Login failed."
            });
        }
    });
});


 // POST: Start a chat with a product seller
app.post("/api/chats", authenticateToken, (req, res) => {
    const productId = Number(req.body.product_id);
    const buyerId = req.user.id;

    if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({
            message: "Please provide a valid product ID."
        });
    }

    const productSql = `
        SELECT id, user_id
        FROM products
        WHERE id = ?
        LIMIT 1
    `;

    db.query(productSql, [productId], (err, products) => {
        if (err) {
            console.error("Chat product lookup error:", err.message);
            return res.status(500).json({
                message: "Failed to start chat."
            });
        }

        if (products.length === 0) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        const sellerId = products[0].user_id;

        if (!sellerId) {
            return res.status(400).json({
                message: "This product has no registered seller."
            });
        }

        if (Number(sellerId) === Number(buyerId)) {
            return res.status(400).json({
                message: "You cannot start a chat with yourself."
            });
        }

                const findChatSql = `
            SELECT c.id
            FROM chats AS c
            LEFT JOIN hidden_chats AS hc
                ON hc.chat_id = c.id
                AND hc.user_id = ?
            WHERE c.product_id = ?
            AND c.buyer_id = ?
            AND c.seller_id = ?
            AND hc.id IS NULL
            LIMIT 1
        `;
       db.query(
    findChatSql,
    [buyerId, sellerId, productId, buyerId, sellerId],
            (err, chats) => {
                if (err) {
                    console.error("Chat lookup error:", err.message);
                    return res.status(500).json({
                        message: "Failed to start chat."
                    });
                }

                if (chats.length > 0) {
                    return res.json({
                        message: "Chat already exists.",
                        chatId: chats[0].id
                    });
                }

                const createChatSql = `
                    INSERT INTO chats (product_id, buyer_id, seller_id)
                    VALUES (?, ?, ?)
                `;

                db.query(
                    createChatSql,
                    [productId, buyerId, sellerId],
                    (err, result) => {
                        if (err) {
                            console.error("Chat creation error:", err.message);
                            return res.status(500).json({
                                message: "Failed to create chat."
                            });
                        }

                        res.status(201).json({
                            message: "Chat created successfully!",
                            chatId: result.insertId
                        });
                    }
                );
            }
        );
    });
});


 // POST: Send a message in a chat
app.post("/api/chats/:id/messages", authenticateToken, (req, res) => {
    const chatId = Number(req.params.id);
    const senderId = req.user.id;
    const messageText = req.body.message_text;

    if (
        !Number.isInteger(chatId) ||
        chatId <= 0 ||
        typeof messageText !== "string" ||
        !messageText.trim()
    ) {
        return res.status(400).json({
            message: "Please provide a valid chat ID and message."
        });
    }

    const chatSql = `
        SELECT id
        FROM chats
        WHERE id = ?
          AND (buyer_id = ? OR seller_id = ?)
        LIMIT 1
    `;

    db.query(chatSql, [chatId, senderId, senderId], (err, chats) => {
        if (err) {
            console.error("Chat verification error:", err.message);
            return res.status(500).json({
                message: "Failed to verify chat."
            });
        }

        if (chats.length === 0) {
            return res.status(404).json({
                message: "Chat not found."
            });
        }

        const sql = `
            INSERT INTO messages (chat_id, sender_id, message_text)
            VALUES (?, ?, ?)
        `;

        db.query(sql, [chatId, senderId, messageText.trim()], (err, result) => {
            if (err) {
                console.error("Message sending error:", err.message);
                return res.status(500).json({
                    message: "Failed to send message."
                });
            }

            res.status(201).json({
                message: "Message sent successfully!",
                messageId: result.insertId,
                chatId: chatId
            });
        });
    });
});


 // GET: View messages in a chat
app.get("/api/chats/:id/messages", authenticateToken, (req, res) => {
    const chatId = Number(req.params.id);
    const userId = req.user.id;

    if (!Number.isInteger(chatId) || chatId <= 0) {
        return res.status(400).json({
            message: "Please provide a valid chat ID."
        });
    }

    const sql = `
        SELECT
            messages.id,
            messages.chat_id,
            messages.sender_id,
            users.full_name AS sender_name,
            messages.message_text,
            messages.sent_at
        FROM chats
        INNER JOIN messages
            ON messages.chat_id = chats.id
        INNER JOIN users
            ON users.id = messages.sender_id
        WHERE chats.id = ?
          AND (chats.buyer_id = ? OR chats.seller_id = ?)
        ORDER BY messages.sent_at ASC, messages.id ASC
    `;

    db.query(sql, [chatId, userId, userId], (err, messages) => {
        if (err) {
            console.error("Error fetching messages:", err.message);
            return res.status(500).json({
                message: "Failed to fetch messages."
            });
        }

        res.json(messages);
    });
});


 
 // GET: List chats for the logged-in user
app.get("/api/chats", authenticateToken, (req, res) => {
    const userId = req.user.id;

    const sql = `
        SELECT
            chats.id AS chat_id,
            chats.product_id,
            products.product_name,
            products.price,
            products.image_url,
            chats.buyer_id,
            buyer.full_name AS buyer_name,
            chats.seller_id,
            seller.full_name AS seller_name,
            latest.message_text AS last_message,
            latest.sent_at AS last_message_at,
            (
                SELECT COUNT(*)
                FROM messages AS unread
                WHERE unread.chat_id = chats.id
                  AND unread.sender_id <> ?
                  AND unread.id > COALESCE(
                      (
                          SELECT cr.last_read_message_id
                          FROM chat_reads AS cr
                          WHERE cr.chat_id = chats.id
                            AND cr.user_id = ?
                      ),
                      0
                  )
            ) AS unread_count
        FROM chats
        INNER JOIN products
            ON products.id = chats.product_id
        INNER JOIN users AS buyer
            ON buyer.id = chats.buyer_id
        INNER JOIN users AS seller
            ON seller.id = chats.seller_id
        LEFT JOIN messages AS latest
            ON latest.id = (
                SELECT m.id
                FROM messages AS m
                WHERE m.chat_id = chats.id
                ORDER BY m.sent_at DESC, m.id DESC
                LIMIT 1
            )
        LEFT JOIN hidden_chats AS hc
            ON hc.chat_id = chats.id
            AND hc.user_id = ?
        WHERE (chats.buyer_id = ? OR chats.seller_id = ?)
          AND hc.id IS NULL
        ORDER BY latest.sent_at DESC, chats.id DESC
    `;

    db.query(sql, [userId, userId, userId, userId, userId], (err, chats) => {
        if (err) {
            console.error("Error fetching chats:", err.message);
            return res.status(500).json({
                message: "Failed to fetch chats."
            });
        }

        res.json(chats);
    });
});


 // POST: Mark a conversation as read
app.post("/api/chats/:id/read", authenticateToken, (req, res) => {
    const chatId = Number(req.params.id);
    const userId = req.user.id;

    if (!Number.isInteger(chatId) || chatId <= 0) {
        return res.status(400).json({
            message: "Invalid chat ID."
        });
    }

    const verifySql = `
        SELECT id
        FROM chats
        WHERE id = ?
          AND (buyer_id = ? OR seller_id = ?)
        LIMIT 1
    `;

    db.query(verifySql, [chatId, userId, userId], (err, chats) => {
        if (err) {
            console.error("Error verifying chat:", err.message);
            return res.status(500).json({
                message: "Failed to verify conversation."
            });
        }

        if (chats.length === 0) {
            return res.status(404).json({
                message: "Conversation not found."
            });
        }

        const readSql = `
            INSERT INTO chat_reads
                (chat_id, user_id, last_read_message_id)
            SELECT ?, ?, COALESCE(MAX(id), 0)
            FROM messages
            WHERE chat_id = ?
            ON DUPLICATE KEY UPDATE
                last_read_message_id = GREATEST(
                    last_read_message_id,
                    VALUES(last_read_message_id)
                )
        `;

        db.query(readSql, [chatId, userId, chatId], (err) => {
            if (err) {
                console.error("Error marking chat as read:", err.message);
                return res.status(500).json({
                    message: "Failed to mark conversation as read."
                });
            }

            res.json({
                message: "Conversation marked as read."
            });
        });
    });
});


// DELETE: Hide a conversation from the current user's inbox
app.delete("/api/chats/:id", authenticateToken, (req, res) => {
    const chatId = Number(req.params.id);
    const userId = req.user.id;

    if (!Number.isInteger(chatId) || chatId <= 0) {
        return res.status(400).json({
            message: "Invalid chat ID."
        });
    }

    const verifySql = `
        SELECT id
        FROM chats
        WHERE id = ?
          AND (buyer_id = ? OR seller_id = ?)
        LIMIT 1
    `;

    db.query(verifySql, [chatId, userId, userId], (err, chats) => {
        if (err) {
            console.error("Error verifying chat:", err.message);
            return res.status(500).json({
                message: "Failed to verify conversation."
            });
        }

        if (chats.length === 0) {
            return res.status(404).json({
                message: "Conversation not found."
            });
        }

        const hideSql = `
            INSERT INTO hidden_chats (user_id, chat_id)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE hidden_at = CURRENT_TIMESTAMP
        `;

        db.query(hideSql, [userId, chatId], (err) => {
            if (err) {
                console.error("Error hiding chat:", err.message);
                return res.status(500).json({
                    message: "Failed to hide conversation."
                });
            }

            res.json({
                message: "Conversation removed from your list."
            });
        });
    });
});

// GET: Fetch external product data from DummyJSON API
app.get("/api/external-products", async (req, res) => {
    try {
        const response = await fetch(
            "https://dummyjson.com/products/category/tops"
        );

        if (!response.ok) {
            return res.status(502).json({
                message: "Failed to fetch external products."
            });
        }

        const data = await response.json();

        res.json({
            message: "External products fetched successfully.",
            products: data.products
        });

    } catch (error) {
        console.error("External API error:", error.message);

        res.status(500).json({
            message: "Unable to connect to the external product API."
        });
    }
});

app.listen(PORT, () => {
    console.log(`ThriftMatch server is running at http://localhost:${PORT}`);
});

