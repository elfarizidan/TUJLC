import React from 'react';
import './Contact.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faPhone, faMapMarkerAlt, faComments } from '@fortawesome/free-solid-svg-icons';
import { faInstagram, faWhatsapp } from '@fortawesome/free-brands-svg-icons'; // Import WhatsApp icon
import white_arrow from '../../assets/white-arrow.png';

function Contact() {
  const [result, setResult] = React.useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    setResult("Sending....");
    const formData = new FormData(event.target);

    formData.append("access_key", "defbba70-4283-4d97-96bc-72bc04e261d1");

    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      setResult("Message Submitted Successfully");
      event.target.reset();
    } else {
      console.log("Error", data);
      setResult(data.message);
    }
  };

  return (
    <div className='contact'>
      <div className="contact-col">
        <h3>
          Send us a message <FontAwesomeIcon icon={faComments} className="icon-main" />
        </h3>
        <p>
          Contact the contact below for new member registration and other information. 
          You can also send a message in the form next to get more information.
        </p>
        <ul>
          <li>
            <a href="mailto:tujlanguageclub@gmail.com">
            <FontAwesomeIcon icon={faEnvelope} className="icon" />
            tujlanguageclub@gmail.com
            </a>
          </li>
          <li>
            <a href="https://wa.me/6285223176656?text=I%20want%20more%20information%20about%20TUJLC%20next%20events" target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faWhatsapp} className="icon" />
              Public Relations Coordinator
            </a>
          </li>
          <li>
            <a href="https://www.instagram.com/languageclub.tukj?igsh=MXhzOGVyd3hxeHd4cg==" target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faInstagram} className="icon" />
              @languageclub.tukj
            </a>
          </li>
        </ul>
      </div>
      <div className="contact-col">
        <form onSubmit={onSubmit}>
          <label>Your Name</label>
          <input type="text" name='name' placeholder='Enter your name' required />
          <label>Phone number</label>
          <input type="tel" name='phone' placeholder='Enter your mobile number' required />
          <label>Write your message here</label>
          <textarea name="message" rows="6" placeholder='Enter your message' required></textarea>
          <button type='submit' className='btn dark-btn'>
            Submit Now <img src={white_arrow} alt="" />
          </button>
        </form>
        <span>{result}</span>
      </div>
    </div>
  );
}

export default Contact;
