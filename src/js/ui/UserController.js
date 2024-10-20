const apiUrl = import.meta.env.VITE_API_URL;

export default class UserController {
    constructor() {
        this.form = document.getElementById('auth-form');
        this.formLogin = document.getElementById('login');
        this.formRegister = document.getElementById('register');
        this.formLogout = document.getElementById('logout');
        this.formEmail = document.getElementById('email');
        this.formPassword = document.getElementById('password');

        this.user;
    }
    
    // Initialize event listeners
    init() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log(e)
            const email = this.formEmail.value;
            const password = this.formPassword.value;

            if (e.submitter.name === "login") {
                const success = await this.login(email, password);
                // alert(success ? 'Login successful!' : 'Login failed.');
            } else if (e.submitter.name === "register") {
                const success = await this.register(email, password);
            } else {
                this.logout();
            }
        });

        // Call autoLogin on page load
        window.addEventListener('load', () => {
            this.autoLogin();
        });
    }

    // Utility function to get user session info
    async getUserSession() {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));

        if (!token) return null;
        if (!user) return null;

        return this.setUser(user);

        // const response = await fetch(`${apiUrl}/user/session`, {
        //     method: 'GET',
        //     headers: {
        //         'Authorization': `Bearer ${token}`,
        //     },
        // });

        // if (response.ok) {
        //     const data = await response.json();
        //     return data; // Returns userId and email
        // } else {
        //     return null;
        // }
    }

    // Utility function to set token in local storage
    setUserSession(response) {
        console.log(response)
        const { token, user } = response;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        this.setUser(user);
    }

    unsetUserSession() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        this.setUser();
    }

    setUser( user ) {
        this.user = user;
        console.log(user)
        if ( user ) {
            this.formEmail.value = user.email;
            this.formEmail.disabled = true;
            this.formPassword.hidden = true;
            this.formLogin.hidden = true;
            this.formRegister.hidden = true;
            this.formLogout.hidden = false;
        } else {
            this.formEmail.disabled = false;
            this.formPassword.hidden = false;
            this.formLogin.hidden = false;
            this.formRegister.hidden = false;
            this.formLogout.hidden = true;
        }

        return user;
    }

    // Register a new user
    async register(email, password) {
        const response = await fetch(`${apiUrl}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
            this.setUserSession(await response.json());
        } else {
            alert((await response.json())['error'])
        }

        return response.ok;
    }

    // Login a user
    async login(email, password) {
        const response = await fetch(`${apiUrl}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
            this.setUserSession(await response.json());
        } else {
            alert((await response.json())['error'])
        }

        response.ok;
    }

    logout() {
        this.unsetUserSession();
    }

    // Auto-login on page load
    async autoLogin() {
        const sessionInfo = await this.getUserSession();
        if (sessionInfo) {
            console.log('User is logged in:', sessionInfo);
            // Update UI or redirect user as necessary
        } else {
            console.log('No active session found.');
        }
    }
}