const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = process.env.PORT || 3000;
const authMiddleware = require('./middleware/authMiddleware');
// Middleware
app.use(express.json());

// First API - GET
app.get('/api/welcome', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to Node.js API!',
        data: {
            name: 'My First API',
            technology: 'Node.js + Express.js'
        }
    });
});

// Second API - GET
app.get('/api/about', (req, res) => {
    res.status(200).json({
        "success": true,
        "message": "This is my first backend application",
        "developer": "Sumit Rana"
    });
});

// Registration API
app.post('/api/register', async (req, res) => {

    try {

        // Get data from request body
        const { name, email, password } = req.body;

        // Check required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Check whether email already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user into database
        const result = await pool.query(
            `INSERT INTO users (name, email, password)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, created_at`,
            [name, email, hashedPassword]
        );

        // Send response
        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: result.rows[0]
        });

    } catch (error) {

        console.error('Registration Error:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });

    }

});

// Login API
app.post('/api/login', async (req, res) => {

    try {

        // Get email and password
        const { email, password } = req.body;

        // Validate fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user by email
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        // Check user exists
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = result.rows[0];

        // Verify password
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '1d'
            }
        );

        // Send successful response
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                token: token
            }
        });

    } catch (error) {

        console.error('Login Error:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });

    }

});
app.get('/api/profile', authMiddleware, (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Profile fetched successfully!',
        user: req.user
    });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});