package co.jp.mkssj.eventplanner;

import co.jp.mkssj.eventplanner.dto.AuthResponseDto;
import co.jp.mkssj.eventplanner.dto.LoginRequest;
import co.jp.mkssj.eventplanner.dto.RegisterRequest;
import co.jp.mkssj.eventplanner.entity.AppUser;
import co.jp.mkssj.eventplanner.repository.AppUserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ユーザー登録・ログインAPIのテスト。
 *
 * 外部公開に伴い /api/auth/register はログイン必須(JwtAuthFilter対象)に変更したため、
 * テストではAppUserRepositoryで直接ブートストラップ用ユーザーを作成してログインし、
 * そのトークンを使ってregisterを呼び出す構成にしている。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuthControllerTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private AppUserRepository appUserRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private AppUser saveUser(String username, String rawPassword) {
        AppUser user = new AppUser();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        return appUserRepository.save(user);
    }

    private String loginAndGetToken(String username, String rawPassword) {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername(username);
        loginRequest.setPassword(rawPassword);
        ResponseEntity<AuthResponseDto> loginResponse =
                restTemplate.postForEntity("/api/auth/login", loginRequest, AuthResponseDto.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(loginResponse.getBody()).isNotNull();
        return loginResponse.getBody().getToken();
    }

    private ResponseEntity<AuthResponseDto> registerWithToken(String token, String username, String password) {
        RegisterRequest request = new RegisterRequest();
        request.setUsername(username);
        request.setPassword(password);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return restTemplate.exchange("/api/auth/register", HttpMethod.POST,
                new HttpEntity<>(request, headers), AuthResponseDto.class);
    }

    @Test
    void registeringWithoutLoginIsRejected() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("test-" + UUID.randomUUID());
        request.setPassword("password123");

        ResponseEntity<String> response =
                restTemplate.postForEntity("/api/auth/register", request, String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void registerAfterLoginThenNewAccountCanLoginToo() {
        String bootstrapUsername = "boot-" + UUID.randomUUID();
        saveUser(bootstrapUsername, "password123");
        String token = loginAndGetToken(bootstrapUsername, "password123");

        String newUsername = "test-" + UUID.randomUUID();
        ResponseEntity<AuthResponseDto> registerResponse = registerWithToken(token, newUsername, "password123");
        assertThat(registerResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(registerResponse.getBody()).isNotNull();
        assertThat(registerResponse.getBody().getUsername()).isEqualTo(newUsername);

        // 新しく作られたアカウントでも普通にログインできる
        String newUserToken = loginAndGetToken(newUsername, "password123");
        assertThat(newUserToken).isNotBlank();
    }

    @Test
    void registeringDuplicateUsernameIsRejected() {
        String bootstrapUsername = "boot-" + UUID.randomUUID();
        saveUser(bootstrapUsername, "password123");
        String token = loginAndGetToken(bootstrapUsername, "password123");

        String username = "test-" + UUID.randomUUID();
        registerWithToken(token, username, "password123");

        ResponseEntity<AuthResponseDto> secondResponse = registerWithToken(token, username, "anotherPassword1");
        assertThat(secondResponse.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void registeringWithShortPasswordIsRejected() {
        String bootstrapUsername = "boot-" + UUID.randomUUID();
        saveUser(bootstrapUsername, "password123");
        String token = loginAndGetToken(bootstrapUsername, "password123");

        ResponseEntity<AuthResponseDto> response =
                registerWithToken(token, "test-" + UUID.randomUUID(), "short");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void loginWithWrongPasswordIsRejected() {
        String username = "test-" + UUID.randomUUID();
        saveUser(username, "password123");

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername(username);
        loginRequest.setPassword("wrongPassword");
        ResponseEntity<String> loginResponse =
                restTemplate.postForEntity("/api/auth/login", loginRequest, String.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void threeFailedAttemptsLocksAccountForTwentyFourHoursEvenWithCorrectPasswordAfterward() {
        String username = "test-" + UUID.randomUUID();
        saveUser(username, "password123");

        LoginRequest wrongLogin = new LoginRequest();
        wrongLogin.setUsername(username);
        wrongLogin.setPassword("wrongPassword");

        // 1回目・2回目は通常の401(まだロックされない)
        for (int i = 0; i < MAX_FAILED_ATTEMPTS_MINUS_ONE; i++) {
            ResponseEntity<String> res = restTemplate.postForEntity("/api/auth/login", wrongLogin, String.class);
            assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        }

        // 3回目の失敗でロックされる(423 LOCKED)
        ResponseEntity<String> thirdRes = restTemplate.postForEntity("/api/auth/login", wrongLogin, String.class);
        assertThat(thirdRes.getStatusCode()).isEqualTo(HttpStatus.LOCKED);

        // ロック中は正しいパスワードでもログインできない
        LoginRequest correctLogin = new LoginRequest();
        correctLogin.setUsername(username);
        correctLogin.setPassword("password123");
        ResponseEntity<String> fourthRes = restTemplate.postForEntity("/api/auth/login", correctLogin, String.class);
        assertThat(fourthRes.getStatusCode()).isEqualTo(HttpStatus.LOCKED);
    }

    private static final int MAX_FAILED_ATTEMPTS_MINUS_ONE = 2;
}
