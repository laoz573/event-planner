package co.jp.mkssj.eventplanner.config;

import co.jp.mkssj.eventplanner.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * JwtAuthFilterを /api/events/** にのみ適用する。
 * /api/auth/** (ログイン・新規登録)は未認証でアクセスできる必要があるため対象外。
 */
@Configuration
@RequiredArgsConstructor
public class FilterConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public FilterRegistrationBean<JwtAuthFilter> jwtAuthFilterRegistration() {
        FilterRegistrationBean<JwtAuthFilter> registration = new FilterRegistrationBean<>(jwtAuthFilter);
        registration.addUrlPatterns("/api/events/*");
        registration.setOrder(1);
        return registration;
    }
}
