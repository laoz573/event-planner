package co.jp.mkssj.eventplanner.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

/**
 * JWT発行・検証ユーティリティ(householdのutil.JwtUtilと同じ方針)。
 *
 * ★ 本番運用では必ず環境変数 JWT_SECRET を設定してください(256bit以上を推奨)。
 *    未設定の場合はJVM起動時にランダムな鍵を生成するため、
 *    アプリ再起動のたびに発行済みトークンが無効になります。
 */
@Component
public class JwtUtil {

    private static final long EXPIRATION_MILLIS = 30L * 24 * 60 * 60 * 1000; // 30日

    private final Key signingKey;

    public JwtUtil() {
        this.signingKey = buildKey();
    }

    private static Key buildKey() {
        String envSecret = System.getenv("JWT_SECRET");
        if (envSecret != null && !envSecret.trim().isEmpty()) {
            return Keys.hmacShaKeyFor(envSecret.getBytes());
        }
        System.out.println("[WARN] JWT_SECRET が未設定です。開発用の一時鍵を使用します(再起動でトークン失効)。");
        return Keys.secretKeyFor(SignatureAlgorithm.HS256);
    }

    /** ログイン成功・新規登録時にトークンを発行する。 */
    public String generateToken(Long userId, String username) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + EXPIRATION_MILLIS);

        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .claim("username", username)
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * トークンを検証しuserIdを返す。
     * 無効・改ざん・期限切れの場合はnullを返す(例外は投げない)。
     */
    public Long validateAndGetUserId(String token) {
        if (token == null || token.trim().isEmpty()) {
            return null;
        }
        try {
            Jws<Claims> jws = Jwts.parserBuilder()
                    .setSigningKey(signingKey)
                    .build()
                    .parseClaimsJws(token);

            return Long.parseLong(jws.getBody().getSubject());
        } catch (JwtException | NumberFormatException e) {
            return null;
        }
    }
}
