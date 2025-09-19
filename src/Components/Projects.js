import React from "react";
import "./Projects.css";
const Projects = () => {
  const cards = [
  {
    id: 1,
    title: "win64py",
    content: "Created a screenshot tool for Windows (64-bit) in Python. Allows capturing screenshots, saving them, possibly with simple editing/filtering. Built for quick utility and ease of use.",
    link: "https://github.com/bp2881/win64py"
  },
  {
    id: 2,
    title: "college-portal",
    content: "Built a REST API for modern tertiary institutions (universities, colleges, polytechnics) using Laravel. It supports features like institution setup, authentication, data modelling, and is designed for extensibility. Migrations, seeding, and environment-based config make it ready for production use.",
    link: "https://github.com/bp2881/college-portal"
  },
  {
    id: 3,
    title: "Sustainable_Living",
    content: "Developed a front-end focussed project ('Sustainable_Living') to raise awareness about eco-friendly habits. Built using HTML, CSS, and possibly JS to present content engagingly and responsively.",
    link: "https://github.github.com/bp2881/Sustainable_Living"
  },
  {
    id: 4,
    title: "installer",
    content: "Created a Python-based installer script/app to streamline installing applications via GUI. Handles dependency checks, setup configurations, and automates installation steps to reduce manual setup work.",
    link: "https://github.com/bp2881/installer"
  },
  {
    id: 5,
    title: "machinelearning-algo",
    content: "Assorted machine learning algorithms implemented for learning and experimentation. Covers core methods, data preprocessing, model training (in Python), helping deepen understanding of ML fundamentals.",
    link: "https://github.com/bp2881/machinelearning-algo"
  }
];


  return (
    <div className="card-container">
      {cards.map((card) => (
        <div key={card.id} className="floating-card">
          <h3>{card.title}</h3>
          <hr/>
          <p>{card.content}</p>
          <a href={card.link} target="_blank" rel="noopener noreferrer" >View Project</a>
        </div>
      ))}
    </div>
  );
};

export default Projects;
