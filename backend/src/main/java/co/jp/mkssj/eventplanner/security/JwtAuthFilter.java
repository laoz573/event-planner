package co.jp.mkssj.eventplanner.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * /api/events/** へのアクセスを一括でJWT認証するフィルタ。
 *
 * household は AuthUtil.resolveUserId(request) を各サーブレットメソッドで
 * 個別に呼び出していたが、ここではFilterに集約して重複をなくしている。
 * 認証成功時は request 属性 "userId" にユーザーIDをセットし、
 * コントローラー側はそれを読むだけでよい。
 */
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final AuthUtil authUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // CORSプリフライトはAuthorizationヘッダーを持たないため素通りさせる
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        Long userId = authUtil.resolveUserId(request);
        if (userId == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json; charset=UTF-8");
            response.getWriter().write("{\"error\":\"not logged in\"}");
            return;
        }

        request.setAttribute("userId", userId);
        filterChain.doFilter(request, response);
    }
}
