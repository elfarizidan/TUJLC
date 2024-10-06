import React from 'react'
import './About.css'
import about_img from '../../assets/about.png'
import play_icon from '../../assets/play-icon.png'

const About = ({setPlayState}) => {
  return (
    <div className='about'>
      <div className="about-left">
        <img src={about_img} alt="" className='about-img'/>
        <img src={play_icon} alt="" className='play-icon' onClick={()=>{setPlayState(true)}}/>
      </div>
      <div className="about-right">
        <h3>About Community</h3>
        <h2>Learn Language Easy and Fun</h2>
        <p>Here we learn and share knowledge about languages.</p>
        <p>Meeting on Saturday</p>
        <p>Learn all new languages</p>

      </div>
    </div>
  )
}

export default About
