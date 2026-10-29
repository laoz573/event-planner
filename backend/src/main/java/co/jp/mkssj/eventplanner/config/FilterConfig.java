package co.jp.mkssj.eventplanner.config;

import co.jp.mkssj.eventplanner.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * JwtAuthFilterを /api/events/**, /api/auth/register, /api/users/**, /api/shares/**,
 * /api/genres/**, /api/actuals/** に適用する。
 * /api/auth/login のみ、未認証でアクセスできる必要があるため対象外。
 *
 * 外部公開にあたり、誰でも自己登録できる状態を廃止した。新しいアカウントの作成は
 * 既にログイン済みの利用者だけができるようにするため、registerもJWT認証必須にしている
 * (AuthController#register参照)。
 *
 * /api/users(共有相手を選ぶための他ユーザー一覧)・/api/shares(イベント共有設定)も
 * ログイン必須のAPIなので同様にここへ追加している。
 */
@Configuration
@RequiredArgsConstructor
public class FilterConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public FilterRegistrationBean<JwtAuthFilter> jwtAuthFilterRegistration() {
        FilterRegistrationBean<JwtAuthFilter> registration = new FilterRegistrationBean<>(jwtAuthFilter);
        registration.addUrlPatterns("/api/events/*", "/api/auth/register", "/api/users/*", "/api/shares/*",
                "/api/genres/*", "/api/actuals/*");
        registration.setOrder(1);
        return registration;
    }
}
