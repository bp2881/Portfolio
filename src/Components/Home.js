import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import Typewriter from "typewriter-effect";
import myImg from '../Assets/mine.jpg';
export default function Home() {
  return (
    <Container fluid className="home-section" id="home">
      <Container>
        
        <Row>
          <Col md={7} className="home-content" style={{paddingTop:'120px',paddingBottom:'120px'}} >
            <h1 style={{ paddingBottom: 15 }} className="heading">
              Hi There!!
              <br/><br/>
            </h1>
            <h1 className="heading-name">
              I'M
              <strong className="main-name"> PRANAV BAIRY</strong>
            </h1>
            <div style={{padding:20,textAlign:"left"}}>
            <div className="typewriter-text"><Typewriter 
      options={{ 
        strings: [
          "A Python Developer",
          "A Machine Learning Enthusiasist",
          "A Passionate Learner",
        ],
        autoStart: true,
        loop: true,
        deleteSpeed: 50,
      }}  
    /></div> 
            </div>
          </Col>
          <Col md={4} className="myAvtar" >
              <img src={myImg}  alt="avatar" style={{height:'400px',width:'400px',borderRadius:'50px',marginTop:'50px'}}/>
          </Col>
        </Row>
      </Container>
    </Container>

  );
}
