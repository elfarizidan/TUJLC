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
        <h2>Learn Language Fun and Easy</h2>
        <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. 
           Corporis, dolorem blanditiis. 
           Et doloribus, distinctio accusantium at explicabo exercitationem ipsam voluptates reiciendis eius laboriosam quasi iusto suscipit, 
           iste vero vitae optio.</p>
           <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Hic tempore omnis voluptatum quisquam perferendis veniam sed aliquid, qui odio illum quos, ipsum excepturi deserunt laudantium soluta commodi amet, nostrum corrupti?</p>
           <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Consequuntur aspernatur repellat unde quas reprehenderit, modi magnam explicabo voluptatibus, magni nisi amet cupiditate maxime harum vel beatae autem? Adipisci, quibusdam iste.</p>

      </div>
    </div>
  )
}

export default About
