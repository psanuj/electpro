import React, { useState } from 'react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle login logic here
        console.log({ email, password, role });
    };

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label>
                    Email:
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </label>
            </div>
            <div>
                <label>
                    Password:
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </label>
            </div>
            <div>
                <label>
                    Role:
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                    >
                        <option value="student">Student</option>
                        <option value="admin">Admin</option>
                    </select>
                </label>
            </div>
            <button type="submit">Login</button>
        </form>
    );
};

export default Login;