import React, { useEffect, useRef } from 'react';
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
import gallery_19 from '../../assets/hero.png';
import gallery_20 from '../../assets/gambar20.jpg';
import white_arrow from '../../assets/white-arrow.png';

const Club = () => {
  const topGalleriesRef = useRef([]);
  const bottomGalleriesRef = useRef([]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const scrollProgress = scrollY * 0.1;

      // Apply scroll to all top galleries
      topGalleriesRef.current.forEach((gallery) => {
        if (gallery) {
          gallery.style.transform = `translateX(-${scrollProgress}px)`;
        }
      });

      // Apply opposite scroll to all bottom galleries
      bottomGalleriesRef.current.forEach((gallery) => {
        if (gallery) {
          gallery.style.transform = `translateX(${scrollProgress}px)`;
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className='campus'>
      {/* First Top Gallery */}
      <div
        className="gallery"
        ref={(el) => (topGalleriesRef.current[0] = el)}
      >
        {[gallery_1, gallery_2, gallery_3, gallery_4, gallery_5].map((image, index) => (
          <div className="gallery-item" key={index}>
            <img src={image} alt={`Gallery ${index + 1}`} />
          </div>
        ))}
      </div>

      {/* First Bottom Gallery */}
      <div
        className="gallery"
        ref={(el) => (bottomGalleriesRef.current[0] = el)}
      >
        {[gallery_6, gallery_7, gallery_8, gallery_9, gallery_10].map((image, index) => (
          <div className="gallery-item" key={index}>
            <img src={image} alt={`Gallery ${index + 1}`} />
          </div>
        ))}
      </div>

      {/* Second Top Gallery */}
      <div
        className="gallery"
        ref={(el) => (topGalleriesRef.current[1] = el)}
      >
        {[gallery_11, gallery_12, gallery_13, gallery_14, gallery_15].map((image, index) => (
          <div className="gallery-item" key={index}>
            <img src={image} alt={`Gallery ${index + 1}`} />
          </div>
        ))}
      </div>

      {/* Second Bottom Gallery */}
      <div
        className="gallery"
        ref={(el) => (bottomGalleriesRef.current[1] = el)}
      >
        {[gallery_16, gallery_17, gallery_18, gallery_19, gallery_20].map((image, index) => (
          <div className="gallery-item" key={index}>
            <img src={image} alt={`Gallery ${index + 1}`} />
          </div>
        ))}
      </div>

      <a href='https://telkomuniversityofficial-my.sharepoint.com/:f:/g/personal/khansafathiyahh_student_telkomuniversity_ac_id/EhovYF6sga5EntRCQRyXTaABMLju0roWTU9sjjDpnx70ng?e=uMeij3'>
        <button className='btn dark-btn'>
          See more here 
          <img src={white_arrow} alt="arrow" />
        </button>
      </a>
    </div>
  );
}

export default Club;
