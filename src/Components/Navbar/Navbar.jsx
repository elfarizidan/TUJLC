import React, { useEffect, useState } from 'react'
import './Navbar.css'
import logo from '../../assets/logo.png'
import { Link } from 'react-scroll';
import menu_icon from '../../assets/menu-icon.png'

const Navbar = () => {

  const[sticky, setSticky] = useState(false);

  useEffect (()=>{
    window.addEventListener('scroll', ()=>{
      window.scrollY > 50 ? setSticky(true) :setSticky(false);
    })
  },[])

  const [MobileMenu, setMobileMenu] = useState(false);
  const toggleMenu = ()=>{
    MobileMenu? setMobileMenu(false) : setMobileMenu(true);
  }
  return (
    <nav className={`container ${sticky? 'dark-nav' : ''}`}>
      <a><Link to='hero' smooth={true} offset={0} duration={500}><img src={logo} alt="" className='logo'/></Link></a>
      <ul className={MobileMenu? '':'hide-mobile-menu'}>
{/*         <li><Link to='hero' smooth={true} offset={0} duration={500}>Home</Link></li> */}
        <li><Link to='program' smooth={true} offset={-260} duration={500}>Program</Link></li>
        <li><Link to='about' smooth={true} offset={-150} duration={500}>About us</Link></li>
        <li><Link to='club' smooth={true} offset={-200} duration={500}>TUJLC</Link></li>
        <li><Link to='testimonials' smooth={true} offset={-260} duration={500}>Testimonials</Link></li>
        <li><Link to='contact' smooth={true} offset={-260} duration={500}><button className='btn'>Contact us</button></Link></li>
      </ul>
      <img src={menu_icon} alt="" className='menu-icon' onClick={toggleMenu}/>
    </nav>
  )
}

export default Navbar
