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

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * ユーザー登録・ログインAPI。
 *
 * /api/auth/login は未認証でアクセス可能(JwtAuthFilter対象外)。
 * /api/auth/register は外部公開にあたりJwtAuthFilterの対象に追加した(FilterConfig参照)。
 * 誰でも自己登録できる状態を廃止し、既にログイン済みの利用者だけが
 * 新しいアカウントを作成できるようにしている(未ログインで呼ぶとフィルタの時点で401になる)。
 *
 * パスワードは平文保存せず、BCryptでハッシュ化して保存する
 * (householdの平文比較方式からのセキュリティ改善)。
 *
 * ブルートフォース対策: 同一ユーザーでパスワードを3回連続で間違えると、
 * その時点から24時間そのアカウントでログインできなくなる(正しいパスワードでも拒否)。
 * 24時間経過後は次回ログイン試行時に自動で失敗回数がリセットされ、通常通りログインできる。
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final int MAX_FAILED_ATTEMPTS = 3;
    private static final long LOCK_DURATION_HOURS = 24;
    private static final DateTimeFormatter LOCK_MESSAGE_FORMAT = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm");

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

        LocalDateTime now = LocalDateTime.now();

        // ロック期限を過ぎていれば、この時点で自動解除してDBにも反映しておく
        if (user.getLockedUntil() != null && !user.getLockedUntil().isAfter(now)) {
            user.setLockedUntil(null);
            user.setFailedAttempts(0);
            appUserRepository.save(user);
        }

        if (user.getLockedUntil() != null) {
            String unlockAt = user.getLockedUntil().format(LOCK_MESSAGE_FORMAT);
            throw new ResponseStatusException(HttpStatus.LOCKED,
                    "パスワードを" + MAX_FAILED_ATTEMPTS + "回間違えたため、このアカウントは一時的にロックされています。"
                            + "(解除予定: " + unlockAt + ")");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            int attempts = user.getFailedAttempts() + 1;
            user.setFailedAttempts(attempts);

            if (attempts >= MAX_FAILED_ATTEMPTS) {
                LocalDateTime unlockAt = now.plusHours(LOCK_DURATION_HOURS);
                user.setLockedUntil(unlockAt);
                appUserRepository.save(user);
                throw new ResponseStatusException(HttpStatus.LOCKED,
                        "パスワードを" + MAX_FAILED_ATTEMPTS + "回間違えたため、このアカウントは24時間ログインできなくなりました。"
                                + "(解除予定: " + unlockAt.format(LOCK_MESSAGE_FORMAT) + ")");
            }

            appUserRepository.save(user);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ユーザー名またはパスワードが正しくありません");
        }

        // ログイン成功: 失敗回数をリセットする
        if (user.getFailedAttempts() != 0) {
            user.setFailedAttempts(0);
            appUserRepository.save(user);
        }

        String token = jwtUtil.generateToken(user.getId(), user.getUsername());
        return AuthResponseDto.builder()
                .token(token)
                .userId(user.getId())
                .username(user.getUsername())
                .build();
    }
}
