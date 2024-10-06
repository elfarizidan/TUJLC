import React from 'react'
import './Hero.css'
import dark_arrow from '../../assets/dark-arrow.png'

const Hero = () => {


  return (
    <div className='hero container'>
      <div className="hero-text">
        <h1>Telkom University Jakarta Language Club</h1>
        <p>
            Share and dicuss to learn new languages
        </p>
        {/* <button className='btn' ><img src={dark_arrow}/></button> */}
      </div>
    </div>
  )
}

export default Hero
