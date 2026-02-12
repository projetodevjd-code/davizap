'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';
import Link from 'next/link';
import styles from './page.module.css';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const registered = searchParams.get('registered');

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.email || !formData.password) {
            setError('Email e senha são obrigatórios');
            return;
        }

        setLoading(true);

        try {
            const result = await signIn('credentials', {
                email: formData.email,
                password: formData.password,
                redirect: false,
            });

            if (result?.error) {
                setError('Email ou senha inválidos');
                return;
            }

            // Get session to check role
            const session = await getSession();

            if (session?.user?.role === 'ADMIN') {
                router.push('/admin/dashboard');
            } else if (session?.user?.role === 'ATENDENTE') {
                router.push('/atendente/dashboard');
            } else {
                router.push('/login');
            }
        } catch (err: any) {
            setError('Erro ao fazer login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className={styles.container}>
            <div className={styles.card}>

                {/* Headings */}
                <h1 className={styles.heading}>
                    Olá,
                </h1>
                <p className={styles.subHeading}>
                    Faça login
                </p>

                {/* Success Message */}
                {registered && (
                    <div className={styles.successBox}>
                        Conta criada com sucesso! Faça login para continuar.
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className={styles.errorBox}>
                        {error}
                    </div>
                )}

                {/* Form */}
                <form className={styles.form} onSubmit={handleSubmit}>

                    <div className={styles.inputGroup}>
                        <label
                            htmlFor="email"
                            className={styles.label}
                        >
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Digite o seu e-mail"
                            className={styles.input}
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label
                            htmlFor="password"
                            className={styles.label}
                        >
                            Senha
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="******"
                            className={styles.input}
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={loading}
                    >
                        {loading ? 'Entrando...' : 'Iniciar'}
                    </button>
                </form>

                {/* Divider */}
                <div className={styles.divider}>
                    <div className={styles.line}></div>
                    <span className={styles.orText}>ou</span>
                    <div className={styles.line}></div>
                </div>

                {/* Social Login */}
                <div className={styles.socialGrid}>
                    <button className={styles.socialButton} type="button">
                        <span className={styles.socialText}>
                            Faça login com
                        </span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4" />
                            <path d="M12.2401 24.0008C15.4766 24.0008 18.2059 22.9382 20.1945 21.1039L16.3275 18.1055C15.2517 18.8375 13.8627 19.252 12.2445 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.3003H1.5166V17.3912C3.55371 21.4434 7.7029 24.0008 12.2401 24.0008Z" fill="#34A853" />
                            <path d="M5.50253 14.3003C5.00236 12.8099 5.00236 11.1961 5.50253 9.70575V6.61481H1.51649C-0.18551 10.0056 -0.18551 14.0004 1.51649 17.3912L5.50253 14.3003Z" fill="#FBBC04" />
                            <path d="M12.2401 4.74966C13.9509 4.7232 15.6044 5.36697 16.8439 6.54867L20.2695 3.12262C18.1001 1.0855 15.2208 -0.034466 12.2401 0.000808666C7.7029 0.000808666 3.55371 2.55822 1.5166 6.61481L5.50264 9.70575C6.45064 6.86173 9.10947 4.74966 12.2401 4.74966Z" fill="#EA4335" />
                        </svg>
                    </button>

                    <button className={styles.socialButton} type="button">
                        <span className={styles.socialText}>
                            Faça login com
                        </span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.05 20.28c-.98.95-2.05 1.96-3.79 1.96-1.7 0-2.31-1.09-4.28-1.09-1.92 0-2.52 1.09-4.24 1.09-1.8 0-3.32-1.63-4.52-3.33-2.45-3.52-2.12-8.54 2.1-10.36 1.83-.82 3.19-.07 4.29-.07 1.03 0 2.94-1.29 4.96-1.12 1.63.14 3.09.82 4.07 2.05-3.52 1.96-2.91 6.88.58 8.16-.39 1.15-.9 2.29-1.74 3.32-.73.91-1.52.88-2.12 1.57zM12.03 7.25c.85-1.03 1.4-2.45 1.25-3.88-1.21.05-2.67.8-3.54 1.82-.78.9-1.46 2.37-1.28 3.76 1.34.1 2.71-.67 3.57-1.7z" fill="#000000" />
                        </svg>
                    </button>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    Ainda não tenho uma conta <Link href="/criar-conta" className={styles.link}>Criar conta</Link>
                </div>

            </div>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <main className={styles.container}>
                <div className={styles.card}>
                    <h1 className={styles.heading}>Carregando...</h1>
                </div>
            </main>
        }>
            <LoginForm />
        </Suspense>
    );
}
