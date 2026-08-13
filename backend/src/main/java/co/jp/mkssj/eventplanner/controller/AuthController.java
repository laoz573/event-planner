package co.jp.mkssj.eventplanner.controller;

import co.jp.mkssj.eventplanner.dto.AuthResponseDto;
import co.jp.mkssj.eventplanner.dto.LoginRequest;
import co.jp.mkssj.eventplanner.dto.RegisterRequest;
import co.jp.mkssj.eventplanner.entity.AppUser;
import co.jp.mkssj.eventplanner.repository.AppUserRepository;
import co.jp.mkssj.eventplanner.security.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * ユーザー登録・ログインAPI。
 * GET /api/events 等と違い、ここはJwtAuthFilterの対象外(未認証でアクセス可能)。
 *
 * パスワードは平文保存せず、BCryptでハッシュ化して保存する
 * (householdの平文比較方式からのセキュリティ改善)。
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AppUserRepository appUserRepository;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponseDto register(@RequestBody @Valid RegisterRequest request) {
        String username = request.getUsername().trim();
        if (appUserRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "そのユーザー名は既に使用されています");
        }

        AppUser user = new AppUser();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        appUserRepository.save(user);

        String token = jwtUtil.generateToken(user.getId(), user.getUsername());
        return AuthResponseDto.builder()
                .token(token)
                .userId(user.getId())
                .username(user.getUsername())
                .build();
    }

    @PostMapping("/login")
    public AuthResponseDto login(@RequestBody @Valid LoginRequest request) {
        AppUser user = appUserRepository.findByUsername(request.getUsername().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ユーザー名またはパスワードが正しくありません"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ユーザー名またはパスワードが正しくありません");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getUsername());
        return AuthResponseDto.builder()
                .token(token)
                .userId(user.getId())
                .username(user.getUsername())
                .build();
    }
}
