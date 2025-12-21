const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../config.env' });

const User = require('../models/User');

async function createAdmin() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/heart-rate-monitor', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB successfully');

    // Kiểm tra xem đã có admin chưa
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('⚠️  Admin account already exists: admin@example.com');
      console.log('   Updating to ensure it has admin role...');
      existingAdmin.role = 'admin';
      existingAdmin.isActive = true;
      
      // Nếu password chưa được hash đúng (có thể đã hash 2 lần), reset lại
      // Kiểm tra xem password có quá dài (đã hash) hay không
      if (existingAdmin.password && existingAdmin.password.length > 50) {
        console.log('   Password already hashed, keeping it');
      } else {
        console.log('   Resetting password to admin123...');
        existingAdmin.password = 'admin123'; // Pre-save hook sẽ hash lại
      }
      
      await existingAdmin.save();
      console.log('✅ Admin account updated successfully');
    } else {
      // Tạo admin mới - KHÔNG hash password trước, để pre-save hook tự hash
      const admin = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'admin123', // Pre-save hook sẽ tự hash
        age: 30,
        gender: 'male',
        phone: '0123456789',
        role: 'admin',
        isActive: true
      });

      await admin.save();
      console.log('✅ Admin account created successfully');
    }

    console.log('\n🔑 Admin credentials:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');
    console.log('   Role: admin');

  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  createAdmin();
}

module.exports = createAdmin;
