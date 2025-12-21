const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './config.env' });

const User = require('../models/User');

async function resetAdminPassword() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/heart-rate-monitor', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB successfully');

    // Tìm admin
    const admin = await User.findOne({ email: 'admin@example.com' }).select('+password');
    if (!admin) {
      console.log('❌ Admin account not found. Please create it first.');
      return;
    }

    console.log('🔑 Resetting admin password...');
    // Reset password - pre-save hook sẽ tự hash
    admin.password = 'admin123';
    await admin.save();

    console.log('✅ Admin password reset successfully');
    console.log('\n🔑 Admin credentials:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');
    console.log('   Role:', admin.role);

  } catch (error) {
    console.error('❌ Error resetting admin password:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  resetAdminPassword();
}

module.exports = resetAdminPassword;
