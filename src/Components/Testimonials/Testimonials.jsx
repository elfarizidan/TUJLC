import React, { useRef } from 'react'
import './Testimonials.css'
import next_icon from '../../assets/next-icon.png'
import back_icon from '../../assets/back-icon.png'
import user1 from '../../assets/user-1.png'
import user2 from '../../assets/user-2.png'
import user3 from '../../assets/user-3.png'
import user4 from '../../assets/user-4.png'


const Testimonials = () => {

    const slider = useRef();
    let tx = 0;

const slideForward = () =>{
    if(tx > -50){
        tx -= 25;
    }
    slider.current.style.transform =`translateX(${tx}%)`;
}
const sliderBackward = () =>{
    if(tx < 0){
        tx += 25;
    }
    slider.current.style.transform =`translateX(${tx}%)`;
}

  return (
    <div className='testimonials'>
      <img src={next_icon} alt="" className='next-btn' onClick={slideForward}/>
      <img src={back_icon} alt="" className='back-btn' onClick={sliderBackward}/>
      <div className="slider">
        <ul ref={slider}>
            <li>
                <div className="slide">
                    <div className="user-info">
                        <img src={user1} alt="" />
                        <div>
                            <h3>Faturrizqi</h3>
                            <span>Community relation</span>
                        </div>
                    </div>
                    <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. 
                        Animi temporibus nam vero beatae dolorem, voluptates doloribus enim rerum. 
                        Tempora, voluptatem minima! Exercitationem neque, 
                        reiciendis nisi id vel aliquid tempore.
                        Nisi.</p>
                </div>
            </li>
            <li>
                <div className="slide">
                    <div className="user-info">
                        <img src={user2} alt="" />
                        <div>
                            <h3>Allyssa Humayra</h3>
                            <span>Deputy head of the community</span>
                        </div>
                    </div>
                    <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. 
                        Animi temporibus nam vero beatae dolorem, voluptates doloribus enim rerum. 
                        Tempora, voluptatem minima! Exercitationem neque, 
                        reiciendis nisi id vel aliquid tempore.
                        Nisi.</p>
                </div>
            </li>
            <li>
                <div className="slide">
                    <div className="user-info">
                        <img src={user3} alt="" />
                        <div>
                            <h3>Yudi</h3>
                            <span>Logistic</span>
                        </div>
                    </div>
                    <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. 
                        Animi temporibus nam vero beatae dolorem, voluptates doloribus enim rerum. 
                        Tempora, voluptatem minima! Exercitationem neque, 
                        reiciendis nisi id vel aliquid tempore.
                        Nisi.</p>
                </div>
            </li>
            <li>
                <div className="slide">
                    <div className="user-info">
                        <img src={user4} alt="" />
                        <div>
                            <h3>Niken Citra</h3>
                            <span>Secretary</span>
                        </div>
                    </div>
                    <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. 
                        Animi temporibus nam vero beatae dolorem, voluptates doloribus enim rerum. 
                        Tempora, voluptatem minima! Exercitationem neque, 
                        reiciendis nisi id vel aliquid tempore.
                        Nisi.</p>
                </div>
            </li>
        </ul>
      </div>
    </div>
  )
}

export default Testimonials
