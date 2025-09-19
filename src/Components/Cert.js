import { Container } from 'react-bootstrap';
import Carousel from 'react-multi-carousel';
import 'react-multi-carousel/lib/styles.css';
import PythonCisco from "../Assets/Python Essentials_page-0001.jpg";
import programming_c from "../Assets/Programming Essentials in C_page-0001.jpg";
import Vhack from "../Assets/vhack.jpeg";
import 'react-multi-carousel/lib/styles.css';
import Database from "../Assets/Data Base Management System_page-0001.jpg";
import Dsa_Python from "../Assets/Programming, Data Structures and Algorithms using Python_page-0001.jpg";
import sql from "../Assets/sql.png";
import CourseraML from "../Assets/Coursera_Superwised_Learning_page-0001.jpg";
import algorithm_design from "../Assets/Design and analysis of algorithms_page-0001.jpg";
import { Row,Col } from "react-bootstrap";
export default function Cert(){
    const responsive = {
        superLargeDesktop: {
          // the naming can be any, depends on you.
          breakpoint: { max: 4000, min: 3000 },
          items: 5
        },
        desktop: {
          breakpoint: { max: 3000, min: 1024 },
          items: 3
        },
        tablet: {
          breakpoint: { max: 1024, min: 464 },
          items: 2
        },
        mobile: {
          breakpoint: { max: 464, min: 0 },
          items: 1
        }
      };

      return (
        <section className='skill1' id='cert'>
            <Container>
                <Row>
                    <Col>
                    <div className='skill-bx'>
                        <h2 className='cert'>Certifications</h2>
                        <p >These are the Credentials that validate my expertise and commitment to professional excellence.</p>
                        <Carousel responsive={responsive} infinite={true} className='skill-slider'>
                        <div className="item">
          <img src={PythonCisco} alt="Python" />
          <h5>Python Essentials</h5>
        </div>
        
        <div className="item">
          <img src={Dsa_Python} alt="DSA" />
          <h5>Data Structures and Algorithms</h5>
        </div>
        {/* <div className="item">
          <img src={Gccp} alt="gccp" />
          <h5>GCCP Workshop</h5>
        </div> */}
        <div className="item">
          <img src={CourseraML} alt="ML" />
          <h5>Machine Learning</h5>
        </div>
         <div className="item">
          <img src={programming_c} alt="C Programming" />
          <h5>Essentials in C Programming</h5>
        </div>
        <div className="item">
          <img src={algorithm_design} alt="Design of Algorithms" />
          <h5>Design Of Algorithms</h5>
        </div>
        <div className="item">
          <img src={sql} alt="SQL" />
          <h5>SQL</h5>
        </div>
        <div className="item">
          <img src={Vhack} alt="Hackathon" />
          <h5>VHACK VITS</h5>
        </div>
        
        <div className="item">
          <img src={Database} alt="DBMS" />
          <h5>Database Management Systems</h5>
        </div>

                        </Carousel>
                    </div>
                    </Col>
                </Row>
            </Container>
        </section>
      )
}
