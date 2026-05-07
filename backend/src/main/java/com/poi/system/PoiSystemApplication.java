package com.poi.system;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class PoiSystemApplication {

    public static void main(String[] args) {
        SpringApplication.run(PoiSystemApplication.class, args);
    }
}
