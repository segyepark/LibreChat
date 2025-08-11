import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalize } from '~/hooks';
const workonLogo = '/assets/figma-icons/workon-logo.svg';
const commentAddIcon = '/assets/figma-icons/comment-add-icon.svg';
const searchIcon = '/assets/figma-icons/search-icon.svg';
const userCardIcon = '/assets/figma-icons/user-card-icon.svg';
const chatConversationIcon = '/assets/figma-icons/chat-conversation-icon.svg';
const giftIcon = '/assets/figma-icons/gift-icon.svg';

interface MenuItemProps {
  icon: string;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onClick, isActive = false }) => (
  <div
    className={`group flex flex-col items-center justify-center gap-1 p-1 rounded-full cursor-pointer transition-all duration-200 ${
      isActive 
        ? 'bg-[#00A0FF] text-white' 
        : 'text-[#94A3B8] hover:bg-[#00A0FF] hover:text-white'
    }`}
    style={{ width: '100px' }}
    onClick={onClick}
  >
    <div className="flex items-center justify-center w-5 h-5">
      <img 
        src={icon} 
        alt={label} 
        className={`w-5 h-5 transition-all duration-200 ${
          isActive 
            ? 'brightness-0 invert' 
            : 'group-hover:brightness-0 group-hover:invert'
        }`}
      />
    </div>
    <span className="text-xs font-normal leading-tight">{label}</span>
  </div>
);

const WorkOnMenu: React.FC = () => {
  const navigate = useNavigate();
  const localize = useLocalize();

  const handleNewChat = () => {
    navigate('/c/new');
  };

  const handleJobSearch = () => {
    // 일자리 찾기 기능 구현
    console.log('일자리 찾기');
  };

  const handleVisaInfo = () => {
    // 비자 정보 기능 구현
    console.log('비자 정보');
  };

  const handleCommunity = () => {
    // 커뮤니티 기능 구현
    console.log('커뮤니티');
  };

  const handleEvents = () => {
    // 이벤트 기능 구현
    console.log('이벤트');
  };

  return (
    <div className="flex flex-col items-center gap-5 pt-4 px-0 w-[175px]">
      {/* WorkOn 로고 */}
      <div className="flex items-center gap-2.5">
        <div className="w-[50px] h-[50px]">
          <img src={workonLogo} alt="WorkOn" className="w-full h-full" />
        </div>
      </div>

      {/* 메뉴 아이템들 */}
      <div className="flex flex-col items-center gap-4 w-full">
        <MenuItem
          icon={commentAddIcon}
          label="새 채팅"
          onClick={handleNewChat}
          isActive={true}
        />
        <MenuItem
          icon={searchIcon}
          label="일자리 찾기"
          onClick={handleJobSearch}
        />
        <MenuItem
          icon={userCardIcon}
          label="비자 정보"
          onClick={handleVisaInfo}
        />
        <MenuItem
          icon={chatConversationIcon}
          label="커뮤니티"
          onClick={handleCommunity}
        />
        <MenuItem
          icon={giftIcon}
          label="이벤트"
          onClick={handleEvents}
        />
      </div>
    </div>
  );
};

export default WorkOnMenu;
