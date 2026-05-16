package org.example.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI cbTradingOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("CBTrading Backend API")
                        .version("v1")
                        .description("Admin and wholesaler APIs for CBTrading."));
    }
}
