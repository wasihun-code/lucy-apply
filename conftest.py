import os


def pytest_configure(config):
    os.environ['OPENSE_TESTING'] = 'true'
