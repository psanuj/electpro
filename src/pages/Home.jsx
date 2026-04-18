import React from 'react';

const Home = () => {
  return (
    <div>
      <h1>Welcome to the Elective Allocation System</h1>
      <section>
        <h2>Features</h2>
        <ul>
          <li>User-friendly interface to allocate courses.</li>
          <li>Real-time updates on course availability.</li>
          <li>Ability to reserve electives based on preferences.</li>
          <li>Overview of past allocations and performance metrics.</li>
        </ul>
      </section>
      <section>
        <h2>How It Works</h2>
        <p>The Elective Allocation System simplifies the process of choosing and reserving elective courses for students. 
        Users can log in, view available courses, and select their preferred electives based on availability and requirements.</p>
        <p>Once selections are made, the system processes the allocations and updates students in real-time, ensuring a seamless experience.</p>
      </section>
    </div>
  );
};

export default Home;