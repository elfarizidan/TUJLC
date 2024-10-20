import React from 'react';
import './Club.css';
import gallery_1 from '../../assets/gambar1.jpg';
import gallery_2 from '../../assets/gambar2.jpg';
import gallery_3 from '../../assets/gambar3.jpg';
import gallery_4 from '../../assets/gambar4.jpg';
import gallery_5 from '../../assets/gambar5.jpg';
import gallery_6 from '../../assets/gambar6.jpg';
import gallery_7 from '../../assets/gambar7.jpg';
import gallery_8 from '../../assets/gambar8.jpg';
import gallery_9 from '../../assets/gambar9.jpg';
import gallery_10 from '../../assets/gambar10.jpg';
import gallery_11 from '../../assets/gambar11.jpg';
import gallery_12 from '../../assets/gambar12.jpg';
import gallery_13 from '../../assets/gambar13.jpg';
import gallery_14 from '../../assets/gambar14.jpg';
import gallery_15 from '../../assets/gambar15.jpg';
import gallery_16 from '../../assets/gambar16.jpg';
import gallery_17 from '../../assets/gambar17.jpg';
import gallery_18 from '../../assets/gambar18.jpg';
import gallery_19 from '../../assets/gambar19.jpg';
import gallery_20 from '../../assets/gambar20.jpg';
import gallery_21 from '../../assets/gambar21.jpg';
import gallery_23 from '../../assets/gambar22.jpg';
import gallery_24 from '../../assets/gambar23.jpg';
import gallery_22 from '../../assets/gambar24.jpg';
import white_arrow from '../../assets/white-arrow.png';

const Club = () => {
  return (
    <div className="club">
      <div className="wrapper">
        <img src={gallery_1} alt="Gallery 1" className="item item1" />
        <img src={gallery_2} alt="Gallery 2" className="item item2" />
        <img src={gallery_3} alt="Gallery 3" className="item item3" />
        <img src={gallery_4} alt="Gallery 4" className="item item4" />
        <img src={gallery_5} alt="Gallery 5" className="item item5" />
        <img src={gallery_6} alt="Gallery 6" className="item item6" />
        <img src={gallery_7} alt="Gallery 7" className="item item7" />
        <img src={gallery_8} alt="Gallery 8" className="item item8" />
      </div>
      <div className="wrapper">
        <img src={gallery_9} alt="Gallery 9" className="item-right right-item1" />
        <img src={gallery_10} alt="Gallery 10" className="item-right right-item2" />
        <img src={gallery_11} alt="Gallery 11" className="item-right right-item3" />
        <img src={gallery_12} alt="Gallery 12" className="item-right right-item4" />
        <img src={gallery_13} alt="Gallery 13" className="item-right right-item5" />
        <img src={gallery_14} alt="Gallery 14" className="item-right right-item6" />
        <img src={gallery_15} alt="Gallery 15" className="item-right right-item7" />
        <img src={gallery_16} alt="Gallery 16" className="item-right right-item8" />
      </div>
      <div className="wrapper">
        <img src={gallery_17} alt="Gallery 17" className="item item1" />
        <img src={gallery_18} alt="Gallery 18" className="item item2" />
        <img src={gallery_19} alt="Gallery 19" className="item item3" />
        <img src={gallery_20} alt="Gallery 20" className="item item4" />
        <img src={gallery_21} alt="Gallery 21" className="item item5" />
        <img src={gallery_22} alt="Gallery 22" className="item item6" />
        <img src={gallery_23} alt="Gallery 23" className="item item7" />
        <img src={gallery_24} alt="Gallery 24" className="item item8" />
      </div>

      <a href='https://telkomuniversityofficial-my.sharepoint.com/:f:/g/personal/khansafathiyahh_student_telkomuniversity_ac_id/EhovYF6sga5EntRCQRyXTaABMLju0roWTU9sjjDpnx70ng?e=uMeij3'>
        <button className='btn dark-btn'>
          See more here 
          <img src={white_arrow} alt="arrow" />
        </button>
      </a>

    </div>
  );
};

export default Club;
