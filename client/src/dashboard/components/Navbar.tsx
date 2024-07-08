import React from 'react';
import '../../styles/dashboard/components/navbar.scss';

interface NavbarProps {
	onMenuSelect: (menu: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuSelect }) => {
	const menuItems = ["Overview", "Define Scope", "Explore Website", "Select Sample", "Audit Sample", "View Report"];

	return (
		<nav className="navbar">
			<ul className="navbar-menu">
				{menuItems.map(item => (
					<li
						key={item}
						className="navbar-item"
						onClick={() => onMenuSelect(item)}
					>
						{item}
					</li>
				))}
			</ul>
		</nav>
	);
}

export default Navbar;
