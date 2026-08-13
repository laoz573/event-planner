package co.jp.mkssj.eventplanner.security;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Authorization: Bearer &lt;JWT&gt; ヘッダーからuserIdを解決するヘルパー。
 * セッションCookieは使わず、ヘッダーのみで認証する(household踏襲)。
 */
@Component
@RequiredArgsConstructor
public class AuthUtil {

    private final JwtUtil jwtUtil;

    public Long resolveUserId(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        String token = authHeader.substring(7).trim();
        return jwtUtil.validateAndGetUserId(token);
    }
}
