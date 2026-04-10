package com.quizcap.service;

import com.quizcap.dto.AuthResponse;
import com.quizcap.dto.LoginRequest;
import com.quizcap.dto.RegisterRequest;
import com.quizcap.model.Role;
import com.quizcap.model.User;
import com.quizcap.repository.UserRepository;
import com.quizcap.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Handles user registration and login.
 */
@Service
public class AuthService {

    @Autowired private UserRepository    userRepository;
    @Autowired private PasswordEncoder   passwordEncoder;
    @Autowired private JwtUtil           jwtUtil;
    @Autowired private AuthenticationManager authManager;

    /**
     * Registers a new student account.
     *
     * @throws IllegalArgumentException if username or email is already taken
     */
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username '" + request.getUsername() + "' is already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email '" + request.getEmail() + "' is already registered");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.STUDENT)
                .build();

        user = userRepository.save(user);

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name());
        return buildAuthResponse(user, token);
    }

    /**
     * Authenticates a user and returns a JWT.
     * Throws AuthenticationException (→ 401) if credentials are wrong.
     */
    public AuthResponse login(LoginRequest request) {
        // Delegates to DaoAuthenticationProvider which calls BCrypt.matches() internally
        Authentication authentication = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        User user = (User) authentication.getPrincipal();
        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name());
        return buildAuthResponse(user, token);
    }

    private AuthResponse buildAuthResponse(User user, String token) {
        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }
}
