package co.jp.mkssj.eventplanner;

import co.jp.mkssj.eventplanner.dto.AuthResponseDto;
import co.jp.mkssj.eventplanner.dto.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ユーザー登録・ログインAPIのテスト。
 * 登録→ログイン成功、ユーザー名重複、パスワード誤り、パスワード短すぎのケースを確認する。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuthControllerTest {

    @Autowired
    private TestRestTemplate restTemplate;

    private RegisterRequest newRegisterRequest(String username, String password) {
        RegisterRequest request = new RegisterRequest();
        request.setUsername(username);
        request.setPassword(password);
        return request;
    }

    @Test
    void registerThenLoginSucceeds() {
        String username = "test-" + UUID.randomUUID();
        ResponseEntity<AuthResponseDto> registerResponse = restTemplate.postForEntity(
                "/api/auth/register", newRegisterRequest(username, "password123"), AuthResponseDto.class);
        assertThat(registerResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(registerResponse.getBody()).isNotNull();
        assertThat(registerResponse.getBody().getToken()).isNotBlank();
        assertThat(registerResponse.getBody().getUsername()).isEqualTo(username);

        ResponseEntity<AuthResponseDto> loginResponse = restTemplate.postForEntity(
                "/api/auth/login", newRegisterRequest(username, "password123"), AuthResponseDto.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(loginResponse.getBody()).isNotNull();
        assertThat(loginResponse.getBody().getToken()).isNotBlank();
    }

    @Test
    void registeringDuplicateUsernameIsRejected() {
        String username = "test-" + UUID.randomUUID();
        restTemplate.postForEntity("/api/auth/register", newRegisterRequest(username, "password123"), AuthResponseDto.class);

        ResponseEntity<String> secondResponse = restTemplate.postForEntity(
                "/api/auth/register", newRegisterRequest(username, "anotherPassword1"), String.class);
        assertThat(secondResponse.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void loginWithWrongPasswordIsRejected() {
        String username = "test-" + UUID.randomUUID();
        restTemplate.postForEntity("/api/auth/register", newRegisterRequest(username, "password123"), AuthResponseDto.class);

        ResponseEntity<String> loginResponse = restTemplate.postForEntity(
                "/api/auth/login", newRegisterRequest(username, "wrongPassword"), String.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void registeringWithShortPasswordIsRejected() {
        String username = "test-" + UUID.randomUUID();
        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/auth/register", newRegisterRequest(username, "short"), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
