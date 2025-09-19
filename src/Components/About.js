import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import Card from "react-bootstrap/Card";
import { ImPointRight } from "react-icons/im";

export default function About() {
  return (
    <Container fluid className="about-section" id="about">
      <Container>
        <Row style={{ justifyContent: "center", padding: "10px" }}>
          <Col
            style={{
              justifyContent: "center",
              paddingTop: "30px",
              paddingBottom: "50px",
            }}
          >
            <h1>
              Know Who <strong className="purple">I am</strong>{" "}
            </h1>
            <Card className="quote-card-view">
              <Card.Body>
                <blockquote className="blockquote mb-0">
                  <p style={{ textAlign: "justify" }}>
                    Hello Everyone!!
                    <br />
                    Hi, I’m <strong>Pranav</strong>, a developer passionate
                    about building practical, real-world software that blends
                    problem-solving with creativity. I enjoy working across
                    different areas of tech, from web development and automation
                    to machine learning and data-driven applications.
                  </p>

                  <p>I’ve worked on projects like:</p>
                  <ul>
                    <li>
                       <strong>College Portal</strong> – a backend system for
                      managing institutions and student data.
                    </li>
                    <li>
                       <strong>Automation tools</strong> – streamlining
                      repetitive tasks like installers and email workflows.
                    </li>
                    <li>
                       <strong>Machine Learning models</strong> – fraud
                      detection, price prediction, and more.
                    </li>
                    <li>
                       <strong>Sustainable Living site</strong> – front-end
                      project to raise awareness of eco-friendly practices.
                    </li>
                  </ul>

                  <p>
                    Currently, I’m exploring AI, machine learning, and
                    full-stack development, while also building a strong
                    foundation in data structures, algorithms, and system
                    design.
                  </p>

                  <p>
                    When I’m not coding, I love experimenting with new tech
                    stacks, optimizing workflows, and contributing to open-source
                    projects.
                  </p>

                  <p>
                     <strong>Currently exploring:</strong> Streamlit tools,
                    scalable backend systems, and multilingual tech solutions.
                    <br />
                     <strong>Always open to collaborations, internships, and
                    meaningful tech conversations!</strong>
                    <br />
                     Let’s connect and build something impactful!
                  </p>

                  <div style={{ textAlign: "left" }}>
                    <p>Apart from Coding, I love to:</p>
                    <ul>
                      <li className="about-activity">
                        <ImPointRight /> Play Games
                      </li>
                      <li className="about-activity">
                        <ImPointRight /> Read Stories
                      </li>
                      <li className="about-activity">
                        <ImPointRight /> Read about evolving technology
                      </li>
                    </ul>
                    <footer className="blockquote-footer">Pranav</footer>
                  </div>
                </blockquote>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Container>
  );
}
