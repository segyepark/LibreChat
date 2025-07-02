const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// 하드코딩된 관리자 계정들
const ADMIN_ACCOUNTS = [
  { email: 'admin@librechat.com', name: 'Admin User' },
  { email: 'manager@librechat.com', name: 'Manager User' },
  // 필요에 따라 더 추가 가능
];

// 관리자 계정인지 확인하는 정적 메서드
adminSchema.statics.isAdmin = function(email) {
  return ADMIN_ACCOUNTS.some(admin => admin.email === email.toLowerCase());
};

// 모든 관리자 계정 목록을 반환하는 정적 메서드
adminSchema.statics.getAdminAccounts = function() {
  return ADMIN_ACCOUNTS;
};

module.exports = mongoose.model('Admin', adminSchema);