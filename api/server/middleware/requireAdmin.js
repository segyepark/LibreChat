const { Admin } = require('~/models');
const { logger } = require('@librechat/data-schemas');

/**
 * 관리자 권한을 확인하는 미들웨어
 */
const requireAdmin = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user || !user.email) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: '로그인이 필요합니다.' 
      });
    }

    // 하드코딩된 관리자 계정인지 확인
    const isAdmin = Admin.isAdmin(user.email);
    
    if (!isAdmin) {
      logger.warn(`Unauthorized admin access attempt by user: ${user.email}`);
      return res.status(403).json({ 
        error: 'Admin access required',
        message: '관리자 권한이 필요합니다.' 
      });
    }

    // 관리자 정보를 req에 추가
    req.isAdmin = true;
    req.adminEmail = user.email;
    
    next();
  } catch (error) {
    logger.error('Error in requireAdmin middleware:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: '서버 오류가 발생했습니다.' 
    });
  }
};

module.exports = requireAdmin;