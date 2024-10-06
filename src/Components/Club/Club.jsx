import React from 'react'
import './Club.css'
import gallery_1 from '../../assets/gallery-1.png'
import gallery_2 from '../../assets/gallery-2.png'
import gallery_3 from '../../assets/gallery-3.png'
import gallery_4 from '../../assets/gallery-4.png'
import white_arrow from '../../assets/white-arrow.png'

const Club = () => {
  return (
    <div className='campus'>
      <div className="gallery">
        <img src={gallery_1} alt="" />
        <img src={gallery_2} alt="" />
        <img src={gallery_3} alt="" />
        <img src={gallery_4} alt="" />
      </div><a href='https://telkomuniversityofficial-my.sharepoint.com/:f:/g/personal/khansafathiyahh_student_telkomuniversity_ac_id/EhovYF6sga5EntRCQRyXTaABMLju0roWTU9sjjDpnx70ng?e=uMeij3'>
        <button className='btn dark-btn'>See more here 
        <img src={white_arrow} alt="" /></button></a>
      
    </div>
  )
}

export default Club
