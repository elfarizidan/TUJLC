import React from 'react';
import './Programs.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPodcast, faPersonChalkboard, faUtensils } from '@fortawesome/free-solid-svg-icons';
import program_1 from '../../assets/program-1.png';
import program_2 from '../../assets/program-2.png';
import program_3 from '../../assets/program-3.png';

function Programs() {
  return (
    <div className='programs' id='program'>
      <div className="program">
        <img src={program_1} alt="Program 1" />
        <div className="caption">
        <FontAwesomeIcon icon={faPodcast} className='awesome-font'/>
            <p>Podcast</p>
        </div>
      </div>
      <div className="program">
        <img src={program_2} alt="Program 2" />
        <div className="caption">
        <FontAwesomeIcon icon={faPersonChalkboard} className='awesome-font'/> 
            <p>Sharing</p>
        </div>
      </div>
      <div className="program">
        <img src={program_3} alt="Program 3" />
        <div className="caption">
            <FontAwesomeIcon icon={faUtensils}className='awesome-font'/> 
            <p>Take a lunch</p>
        </div>
      </div>
    </div>
  );
}

export default Programs;
