import React, { useState } from 'react';
import '../../styles/dashboard/components/navbar.scss';

interface NavbarProps {
	onMenuSelect: (menu: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuSelect }) => {
	const menuItems = ["Overview", "Define Scope", "Explore Website", "Select Sample", "Audit Sample", "View Report"];

	// Estado para mantener el ítem seleccionado
	const [selectedItem, setSelectedItem] = useState<string | null>(null);

	// Función para manejar el clic en un ítem
	const handleItemClick = (item: string) => {
		setSelectedItem(item); // Actualiza el ítem seleccionado
		onMenuSelect(item);    // Llama a la función proporcionada por las props
	};

	return (
		<nav className="navbar">
			<ul className="navbar-menu">
				{menuItems.map(item => (
					<li
						key={item}
						className={`navbar-item ${selectedItem === item ? 'selected' : ''}`}
						onClick={() => handleItemClick(item)}
					>
						{item}
					</li>
				))}
			</ul>
		</nav>
	);
}

export default Navbar;
