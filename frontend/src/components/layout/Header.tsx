import React from 'react';

interface HeaderProps {
  userName?: string;
}

const Header: React.FC<HeaderProps> = ({ userName = 'Saachi' }) => {
  return (
    <header className="header">
      <h1>Hello, {userName}</h1>
    </header>
  );
};

export default Header;