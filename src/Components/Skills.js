import React from "react";
import { Container,Row,Col } from "react-bootstrap";
import Card from 'react-bootstrap/Card';
import python from '../Assets/python.jpeg';
import html from '../Assets/html.jpeg';
import css from '../Assets/css.jpeg';
import cpp from '../Assets/cpp.png';
import java from '../Assets/java.jpeg';
import bs from '../Assets/bs.jpeg';
import react from '../Assets/react.jpeg';
import django from '../Assets/django.jpg';
import flask from '../Assets/flask.png';
import sql from '../Assets/sql.jpeg';
import postgresql from '../Assets/postgresql.png';
import dsa from '../Assets/dsa.jpeg';
import oops from '../Assets/oops.png';
import ml from '../Assets/ml.jpeg';

export default function Skills(){
    return(
        <Container  className='skills' id='skills'>
            <Row><h2>Programming Languages</h2>
                <Col>
                <Card className="carditem"><Card.Title style={{textAlign:'center'}}>C++</Card.Title><hr/>
                <Card.Body><img src={cpp} alt="cpp" className="skill" /></Card.Body></Card>              
                </Col>
                <Col>
                <Card className="carditem" ><Card.Title style={{textAlign:'center'}}>Python</Card.Title><hr/ >
                <Card.Body className="card-body"><img src={python} alt="python" className="skill" /></Card.Body> 
                </Card> </Col>
                <Col> 
                <Card className="carditem" ><Card.Title style={{textAlign:'center'}}>Java</Card.Title><hr/ >
                <Card.Body className="card-body"><img src={java} alt="java"  className="skill" /></Card.Body> 
                </Card> </Col> 
                </Row><hr/>
                <Row> <h2>Web Technologies</h2>
                <Col>
                <Card className="carditem"><Card.Title style={{textAlign:'center'}}>HTML5</Card.Title><hr/>
                <Card.Body className="card-body" ><img src={html} alt="html" className="skill" /></Card.Body></Card>              
                </Col><Col>
                <Card className="carditem"><Card.Title style={{textAlign:'center'}}>CSS</Card.Title><hr/>
                <Card.Body className="card-body"><img src={css} alt="css" className="skill" /></Card.Body></Card>              
                </Col>
                
                <Col>
                <Card className="carditem"><Card.Title style={{textAlign:'center'}}>Bootstrap</Card.Title><hr/>
                <Card.Body><img src={bs} alt="bs" className="skill" /></Card.Body></Card>              
                </Col></Row>
                <Row>
                <Col md={4}>
                <Card className="carditem"><Card.Title style={{textAlign:'center' }}>React.js</Card.Title><hr/>
                <Card.Body><img src={react} alt="react" className="skill" style={{width:'220px'}} /></Card.Body></Card>              
                </Col>
                <Col>
                <Card className="carditem"><Card.Title style={{textAlign:'center' }}>Django</Card.Title><hr/>
                <Card.Body><img src={django} alt="django" className="skill" style={{width:'220px'}} /></Card.Body></Card>              
                </Col>
                <Col>
                <Card className="carditem"><Card.Title style={{textAlign:'center' }}>Flask</Card.Title><hr/>
                <Card.Body><img src={flask} alt="flask" className="skill" style={{width:'220px'}} /></Card.Body></Card>              
                </Col>
            </Row><hr/>
            <Row> <h2>Databases</h2>
            <Col md={4}>
                <Card className="carditem"><Card.Title style={{textAlign:'center' }}>SQL</Card.Title><hr/>
                <Card.Body><img src={sql} alt="sql" className="skill"  /></Card.Body></Card>              
                </Col>
                <Col>
                <Card className="carditem"><Card.Title style={{textAlign:'center' }}>Postgresql</Card.Title><hr/>
                <Card.Body><img src={postgresql} alt="postgresql" className="skill"  /></Card.Body></Card>              
                </Col>
            </Row><hr/>
            <Row> <h2>Computer Science Concepts</h2>
            <Col md={4}>
                <Card className="carditem"><Card.Title style={{textAlign:'center' }}>DSA</Card.Title><hr/>
                <Card.Body><img src={dsa} alt="dsa" className="skill"  /></Card.Body></Card>              
                </Col>
                <Col>
                <Card className="carditem"><Card.Title style={{textAlign:'center' }}>Machine Learning</Card.Title><hr/>
                <Card.Body><img src={ml} alt="ml" className="skill"  /></Card.Body></Card>              
                </Col>
                <Col>
                <Card className="carditem"><Card.Title style={{textAlign:'center' }}>Object Oriented Programming</Card.Title><hr/>
                <Card.Body><img src={oops} alt="oops" className="skill"  /></Card.Body></Card>              
                </Col>
            </Row>
        </Container>
    )
}
