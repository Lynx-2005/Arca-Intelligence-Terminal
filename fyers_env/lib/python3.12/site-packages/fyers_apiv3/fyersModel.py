import logging
import urllib.parse
import hashlib
import json
import subprocess
import sys
import requests
import json
import urllib
import aiohttp
import json
from fyers_apiv3.fyers_logger import FyersLogger


class Config:

    #URL's
    API = 'https://api-t1.fyers.in/api/v3'
    DATA_API = "https://api-t1.fyers.in/data"

    # Endpoint
    get_profile = "/profile"
    tradebook = "/tradebook"
    positions = "/positions"
    holdings = "/holdings"
    convert_position = "/positions"
    funds = "/funds"
    orders_endpoint = "/orders/sync"
    gtt_orders_sync = "/gtt/orders/sync"
    orderbook = "/orders"
    gtt_orders = "/gtt/orders"
    market_status = "/marketStatus"
    auth = "/generate-authcode"
    generate_access_token = "/validate-authcode"
    generate_data_token = "/data-token"
    data_vendor_td = "/truedata-ws"
    multi_orders = "/multi-order/sync"
    history = "/history"
    quotes = "/quotes"
    market_depth = "/depth"
    option_chain = "/options-chain-v3"
    multileg_orders = "/multileg/orders/sync"
    logout = "/logout"
    price_alert ="/price-alert"
    toggle_alert = "/toggle-alert"
    create_smartorder_step ="/smart-order/step"
    create_smartorder_limit ="/smart-order/limit"
    create_smartorder_trail ="/smart-order/trail"
    create_smartorder_sip ="/smart-order/sip"
    modify_smartorder="/smart-order/modify"
    cancel_smartorder="/smart-order/cancel"
    pause_smartorder="/smart-order/pause"
    resume_smartorder="/smart-order/resume"
    smartorder_orderbook="/smart-order/orderbook"
    smartexit_trigger="/flows/tc/se"
    activate_smartexit_trigger="/flows/tc/se/activate"
    orderhistory = "/order-history"
    tradeHistory = "/trade-history"    
    
    



class FyersServiceSync:
    def __init__(self, logger,request_logger):
        """
        Initializes an instance of FyersServiceSync.

        Args:
            logger: The logger object used for logging errors.
            request_logger: The logger object used for logging requests.
        """
        self.api_logger = logger
        self.request_logger = request_logger
        self.content = "application/json"
        self.error_resp = {"s":"error", "code": 0 , "message":"Bad request"}
        self.error_message = "invalid input please check your input"
        self.session = requests.Session()


    def post_call(self, api: str, header: str, data=None) -> dict:
        """
        Makes a POST request to the specified API.

        Args:
            api: The API endpoint to make the request to.
            header: The authorization header for the request.
            data: The data to send in the request payload.

        Returns:
            The response JSON as a dictionary, or the response object if an error occurs.
        """
        try:
            URL = Config.API + api 
            response = self.session.post(
                URL,
                data=json.dumps(data),
                headers={"Authorization": header, "Content-Type": self.content ,"version": "3"},
            )
            self.request_logger.debug({"Status Code":response.status_code, "API":api  })
            self.api_logger.debug({"URL": URL, "post data": json.dumps(data), \
                                   "Response Status Code": response.status_code, \
                                    "Response": response.json()})
            response.raise_for_status()
            return response.json()
        
        except requests.HTTPError as e:
            self.api_logger.error({"API":api, "Error": response.json()})
            return response.json()
            
        except TypeError as e:
            if "response" in locals():
                self.error_resp["code"] = response.status_code
            else:
                self.error_resp["code"] = -99
                self.error_resp["message"]=self.error_message
            self.api_logger.error({"API": api, "error": e})
            self.api_logger.debug({"URL": URL,"data": json.dumps(data),"message": self.error_resp})
            return self.error_resp 
                 
        except Exception as e:
            if "response" in locals():
                self.error_resp["code"] = response.status_code
            else:
                self.error_resp["code"] = -99
            self.api_logger.error({"API": api, "error": e})
            self.api_logger.debug({"URL": URL,"data": json.dumps(data),"message": e})
            return self.error_resp

    def get_call(self, api: str, header: str, data=None, data_flag=False) -> dict:
        """
        Makes a GET request to the specified API.

        Args:
            api: The API endpoint to make the request to.
            header: The authorization header for the request.
            data: The data to send in the request query parameters.
            data_flag: A flag indicating whether to use custom data URLs.

        Returns:
            The response JSON as a dictionary, or the response object if an error occurs.
        """
        try:
            if data_flag:
                URL = Config.DATA_API + api
            else:
                URL = Config.API + api  
            if data is not None:
                url_params = urllib.parse.urlencode(data)
                URL = URL + "?" + url_params   
            response = self.session.get(
                url=URL,
                headers={
                    "Authorization": header,
                    "Content-Type": self.content,
                    "version": "3"
                },
            )
            self.request_logger.debug({"Status Code":response.status_code, "API":api  })
            self.api_logger.debug({"URL": URL, "Status Code": response.status_code, "Response": response.json()})
            response.raise_for_status()
            return response.json()

        except requests.HTTPError as e:
            self.api_logger.error({"API":api, "Error": response.json()})
            return response.json()
   
        except TypeError as e:
            if "response" in locals():
                self.error_resp["code"] = response.status_code
            else:
                self.error_resp["code"] = -99
                self.error_resp["message"]=self.error_message
            self.api_logger.error({"API": api, "error": e})
            self.api_logger.debug({"URL": URL,"message": self.error_resp})
            return self.error_resp 
                 
        except Exception as e:
            if "response" in locals():
                self.error_resp["code"] = response.status_code
            else:
                self.error_resp["code"] = -99
            self.api_logger.error({"API": api, "error": e})
            self.api_logger.debug({"URL": URL,"message": e})
            return self.error_resp
        
    def delete_call(self, api: str, header: str, data) -> dict:
        """
        Makes a DELETE request to the specified API.

        Args:
            api: The API endpoint to make the request to.
            header: The authorization header for the request.
            data: The data to send in the request payload.

        Returns:
            The response JSON as a dictionary, or the response object if an error occurs.
        """
        try:
            URL = Config.API + api
            response = self.session.delete(
                URL,
                data=json.dumps(data),
                headers={"Authorization": header, "Content-Type": self.content ,"version": "3"},
            )
            self.request_logger.debug({"Status Code":response.status_code, "API":api  })
            self.api_logger.debug({"URL": URL, "data": json.dumps(data), \
                                   "Response Status Code": response.status_code,\
                                   "Response": response.json()})
            response.raise_for_status()
            return response.json()

        except requests.HTTPError as e:
            self.api_logger.error({"API":api, "Error": response.json()})
            return response.json()
        
        except TypeError as e:
            if "response" in locals():
                self.error_resp["code"] = response.status_code
            else:
                self.error_resp["code"] = -99
                self.error_resp["message"]=self.error_message
            self.api_logger.error({"API": api, "error": e})
            self.api_logger.debug({"URL": URL,"data": json.dumps(data),"message": self.error_resp})
            return self.error_resp 
                 
        except Exception as e:
            if "response" in locals():
                self.error_resp["code"] = response.status_code
            else:
                self.error_resp["code"] = -99
            self.api_logger.error({"API": api, "error": e})
            self.api_logger.debug({"URL": URL,"data": json.dumps(data),"message": e})
            return self.error_resp
        

    def patch_call(self, api: str, header: str, data) -> dict:
        """
        Makes a PATCH request to the specified API.

        Args:
            api: The API endpoint to make the request to.
            header: The authorization header for the request.
            data: The data to send in the request payload.

        Returns:
            The response JSON as a dictionary, or the response object if an error occurs.
        """
        try:
            URL = Config.API + api
            response = self.session.patch(
                URL,
                data=json.dumps(data),
                headers={"Authorization": header, "Content-Type": self.content ,"version": "3"},
            )
            self.request_logger.debug({"Status Code":response.status_code, "API":api  })
            self.api_logger.debug({"URL": URL, "data": json.dumps(data), \
                                   "Response Status Code": response.status_code, \
                                   "Response": response.json()})
            response.raise_for_status()            
            return response.json()

        except requests.HTTPError as e:
            self.api_logger.error({"API":api, "Error": response.json()})
            return response.json()
        
        except TypeError as e:
            if "response" in locals():
                self.error_resp["code"] = response.status_code
            else:
                self.error_resp["code"] = -99
                self.error_resp["message"]=self.error_message
            self.api_logger.error({"API": api, "error": e})
            self.api_logger.debug({"URL": URL,"data": json.dumps(data),"message": self.error_resp})
            return self.error_resp 
                 
        except Exception as e:
            if "response" in locals():
                self.error_resp["code"] = response.status_code
            else:
                self.error_resp["code"] = -99
            self.api_logger.error({"API": api, "error": e})
            self.api_logger.debug({"URL": URL,"data": json.dumps(data),"message": e})
            return self.error_resp

    def put_call(self, api: str, header: str, data) -> dict:
        """
        Makes a PUT request to the specified API.

        Args:
            api: The API endpoint to make the request to.
            header: The authorization header for the request.
            data: The data to send in the request payload.

        Returns:
            The response JSON as a dictionary, or the response object if an error occurs.
        """
        try:
            URL = Config.API + api
            response = self.session.put(
                URL,
                data=json.dumps(data),
                headers={"Authorization": header, "Content-Type": self.content ,"version": "3"},
            )
            self.request_logger.debug({"Status Code":response.status_code, "API":api  })
            self.api_logger.debug({"URL": URL, "data": json.dumps(data), \
                                   "Response Status Code": response.status_code, \
                                   "Response": response.json()})
            response.raise_for_status()            
            return response.json()

        except requests.HTTPError as e:
            self.api_logger.error({"API":api, "Error": response.json()})
            return response.json()
        
        except TypeError as e:
            if "response" in locals():
                self.error_resp["code"] = response.status_code
            else:
                self.error_resp["code"] = -99
                self.error_resp["message"]=self.error_message
            self.api_logger.error({"API": api, "error": e})
            self.api_logger.debug({"URL": URL,"data": json.dumps(data),"message": self.error_resp})
            return self.error_resp 
                 
        except Exception as e:
            if "response" in locals():
                self.error_resp["code"] = response.status_code
            else:
                self.error_resp["code"] = -99
            self.api_logger.error({"API": api, "error": e})
            self.api_logger.debug({"URL": URL,"data": json.dumps(data),"message": e})
            return self.error_resp

class FyersServiceAsync:
    def __init__(self, logger, request_logger):
        """
        Initializes an instance of FyersServiceAsync.

        Args:
            logger: The logger object used for logging errors.
            request_logger: The logger object used for logging requests.
        """
        self.api_logger = logger
        self.request_logger = request_logger
        self.content = "application/json"
        self.error_resp = {"s":"error", "code": 0 , "message":"Bad request"}
        self.error_message = "invalid input please check your input"
        self.session = None
        self._session_created_here = True


    async def post_async_call(self, api: str, header: str, data=None) -> dict:
        """
        Makes an asynchronous POST request to the specified API.

        Args:
            api: The API endpoint to make the request to.
            header: The authorization header for the request.
            data: The data to send in the request payload.

        Returns:
            The response JSON as a dictionary, or the response object if an error occurs.
        """
        try:
            url = Config.API + api
            # Create session on first use if not provided
            if self.session is None:
                self.session = aiohttp.ClientSession()
            
            headers = {"Authorization": header, "Content-Type": self.content, "version": "3"}
            async with self.session.post(url, data=json.dumps(data), headers=headers) as response:
                self.request_logger.debug({"Status Code":response.status, "API":api  })
                content = await response.read()
                self.api_logger.debug({"URL": url,"Post Data": json.dumps(data), \
                                       "Response Status Code": response.status, \
                                        "Response": json.loads(content)})
                response.raise_for_status()
                response = await response.json()
                return response

        except aiohttp.ClientResponseError as e:
            self.api_logger.error({"Api": api, "Response": json.loads(content)})
            return await response.json()
                
        except TypeError as e:
            if "response" in locals():
                self.error_resp["code"] = response.status
            else:
                self.error_resp["code"] = -99
                self.error_resp["message"]=self.error_message
            self.api_logger.error({"API": api, "error": e})
            self.api_logger.debug({"URL": url,"Post Data": json.dumps(data),"message": self.error_resp})
            return self.error_resp 
                 
        except Exception as e:
            if "response" in locals():
                self.error_resp["code"] = response.status
            else:
                self.error_resp["code"] = -99
            self.api_logger.error({"API": api, "error": e})
            self.api_logger.debug({"URL": url,"Post Data": json.dumps(data),"message": e})
            return self.error_resp

    async def get_async_call(
        self, api: str, header: str, params=None, data_flag=False
    ) -> dict:
        """
        Makes an asynchronous GET request to the specified API.

        Args:
            api: The API endpoint to make the request to.
            header: The authorization header for the request.
            params: The query parameters to send with the request.
            data_flag: A flag indicating whether to use custom data URLs.

        Returns:
            The response JSON as a dictionary, or the response object if an error occurs.
        """
        try:
            if data_flag:
                URL = Config.DATA_API + api
            else:
                URL = Config.API + api
            # Create session on first use if not provided
            if self.session is None:
                self.session = aiohttp.ClientSession()
            
            headers = {
                "Authorization": header,
                "Content-Type": self.content,
                "version": "3",
            }
            async with self.session.get(URL, params=params, headers=headers) as response:
                self.request_logger.debug({"Status Code": response.status, "API":api })
                content = await response.read()
                self.api_logger.debug({"URL": URL, "Status Code": response.status, "Response": json.loads(content)})
                response.raise_for_status()
                response = await response.json()
                return response               

        except aiohttp.ClientResponseError as e:
            self.api_logger.error({"Api": api, "Response": json.loads(content)})
            return await response.json() 

        except TypeError as e:
            if "response" in locals():
                self.error_resp["code"] = response.status
            else:
                self.error_resp["code"] = -99
                self.error_resp["message"]= self.error_message
            self.api_logger.error({"API": api, "error": e})
            self.api_logger.debug({"URL": URL,"message": self.error_resp})
            return self.error_resp

        except Exception as e:
            if "response" in locals():
                self.error_resp["code"] = response.status
            else:
                self.error_resp["code"] = -99
            self.api_logger.error({"API": api, "error": e})
            self.api_logger.debug({"URL": URL,"message": e})
            return self.error_resp

    async def delete_async_call(self, api: str, header: str, data) -> dict:
        """
        Makes an asynchronous DELETE request to the specified API.

        Args:
            api: The API endpoint to make the request to.
            header: The authorization header for the request.
            data: The data to send in the request payload.

        Returns:
            The response JSON as a dictionary, or the response object if an error occurs.
        """
        try:
            url = Config.API + api
            # Create session on first use if not provided
            if self.session is None:
                self.session = aiohttp.ClientSession()
            
            headers = {"Authorization": header, "Content-Type": self.content, "version": "3"}
            async with self.session.delete(url, data=json.dumps(data), headers=headers) as response:
                self.request_logger.debug({"Status Code": response.status, "API":api })
                content = await response.read()
                self.api_logger.debug({"URL": url, "data": json.dumps(data), \
                                        "Response Status Code": response.status, \
                                        "Response": json.loads(content)})
                response.raise_for_status()
                response = await response.json()          
                return response

        except aiohttp.ClientResponseError as e:
            self.api_logger.error({"Api": api, "Response": json.loads(content)})
            return await response.json()

        except TypeError as e:
            if "response" in locals():
                self.error_resp["code"] = response.status
            else:
                self.error_resp["code"] = -99
                self.error_resp["message"]=self.error_message
            self.api_logger.error({"API": api, "error": e})
            self.api_logger.debug({"URL": url,"data": json.dumps(data),"message": self.error_resp})
            return self.error_resp 
                 
        except Exception as e:
            if "response" in locals():
                self.error_resp["code"] = response.status
            else:
                self.error_resp["code"] = -99
            self.api_logger.error({"API": api, "error": e})
            self.api_logger.debug({"URL": url,"data": json.dumps(data),"message": e})
            return self.error_resp

    async def patch_async_call(self, api: str, header: str, data) -> dict:
        """
        Makes an asynchronous PATCH request to the specified API.

        Args:
            api: The API endpoint to make the request to.
            header: The authorization header for the request.
            data: The data to send in the request payload.

        Returns:
            The response JSON as a dictionary, or the response object if an error occurs.
        """
        try:
            url = Config.API + api
            # Create session on first use if not provided
            if self.session is None:
                self.session = aiohttp.ClientSession()
            
            json_data = json.dumps(data).encode("utf-8")
            headers = {"Authorization": header, "Content-Type": self.content, "version": "3"}
            async with self.session.patch(url, data=json_data, headers=headers) as response:
                self.request_logger.debug({"Status Code": response.status, "API":api })
                content = await response.read()
                self.api_logger.debug({"URL": url, "data": json.dumps(data), \
                                      "Status Code": response.status, \
                                      "Response": json.loads(content)})
                response.raise_for_status()
                response = await response.json()           
                return response 
                
        except aiohttp.ClientResponseError as e:
            self.api_logger.error({"Api": api, "Response": json.loads(content)})
            return await response.json()
        
        except TypeError as e:
            if "response" in locals():
                self.error_resp["code"] = response.status
            else:
                self.error_resp["code"] = -99
                self.error_resp["message"]=self.error_message
            self.api_logger.error({"API": api, "error": e})
            self.api_logger.debug({"URL": url,"data": json.dumps(data),"message": self.error_resp})
            return self.error_resp 
                 
        except Exception as e:
            if "response" in locals():
                self.error_resp["code"] = response.status
            else:
                self.error_resp["code"] = -99
            self.api_logger.error({"API": api, "error": e})
            self.api_logger.debug({"URL": url,"data": json.dumps(data),"message": e})
            return self.error_resp

    async def put_async_call(self, api: str, header: str, data) -> dict:
        """
        Makes an asynchronous PUT request to the specified API.

        Args:
            api: The API endpoint to make the request to.
            header: The authorization header for the request.
            data: The data to send in the request payload.

        Returns:
            The response JSON as a dictionary, or the response object if an error occurs.
        """
        try:
            url = Config.API + api
            # Create session on first use if not provided
            if self.session is None:
                self.session = aiohttp.ClientSession()
            
            json_data = json.dumps(data).encode("utf-8")
            headers = {"Authorization": header, "Content-Type": self.content, "version": "3"}
            async with self.session.put(url, data=json_data, headers=headers) as response:
                self.request_logger.debug({"Status Code": response.status, "API":api })
                content = await response.read()
                self.api_logger.debug({"URL": url, "data": json.dumps(data), \
                                      "Status Code": response.status, \
                                      "Response": json.loads(content)})
                response.raise_for_status()
                response = await response.json()           
                return response 
                
        except aiohttp.ClientResponseError as e:
            self.api_logger.error({"Api": api, "Response": json.loads(content)})
            return await response.json()
        
        except TypeError as e:
            if "response" in locals():
                self.error_resp["code"] = response.status
            else:
                self.error_resp["code"] = -99
                self.error_resp["message"]=self.error_message
            self.api_logger.error({"API": api, "error": e})
            self.api_logger.debug({"URL": url,"data": json.dumps(data),"message": self.error_resp})
            return self.error_resp 
                 
        except Exception as e:
            if "response" in locals():
                self.error_resp["code"] = response.status
            else:
                self.error_resp["code"] = -99
            self.api_logger.error({"API": api, "error": e})
            self.api_logger.debug({"URL": url,"data": json.dumps(data),"message": e})
            return self.error_resp

    async def close(self):
        """
        Closes the aiohttp session if it was created by this instance.
        Should be called when done with the service to properly clean up resources.
        """
        if self.session is not None and self._session_created_here:
            await self.session.close()
            self.session = None



class SessionModel:
    def __init__(
        self,
        client_id=None,
        redirect_uri=None,
        response_type=None,
        scope=None,
        state=None,
        nonce=None,
        secret_key=None,
        grant_type=None,
    ):
        self.client_id = client_id
        self.redirect_uri = redirect_uri
        self.response_type = response_type
        self.scope = scope
        self.state = state
        self.nonce = nonce
        self.secret_key = secret_key
        self.grant_type = grant_type

    def generate_authcode(self):
        data = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": self.response_type,
            "state": self.state,
        }
        if self.scope is not None:
            data["scope"] = self.scope
        if self.nonce is not None:
            data["nonce"] = self.nonce

        url_params = urllib.parse.urlencode(data)
        return f"{Config.API}{Config.auth}?{url_params}"

    def get_hash(self):
        hash_val = hashlib.sha256(f"{self.client_id}:{self.secret_key}".encode())
        return hash_val

    def set_token(self, token):
        self.auth_token = token

    def generate_token(self):
        data = {
            "grant_type": self.grant_type,
            "appIdHash": self.get_hash().hexdigest(),
            "code": self.auth_token,
        }
        response = requests.post(
            Config.API + Config.generate_access_token, headers="", json=data
        )
        return response.json()


class FyersModel:
    def __init__(
        self,
        is_async: bool = False,
        log_path=None,
        client_id: str = "",
        token: str = "",
        log_level: str = "ERROR"
    ):
        """
        Initializes an instance of FyersModelv3.

        Args:
            is_async: A boolean indicating whether API calls should be made asynchronously.
            client_id: The client ID for API authentication.
            token: The token for API authentication.
        """
        self.client_id = client_id
        self.token = token
        self.is_async = is_async
        self.log_path = log_path
        self.header = "{}:{}".format(self.client_id, self.token)
        self.log_level = log_level
        if log_path:
            self.log_path = log_path + "/"
        else:
            self.log_path = ""

        self.api_logger = FyersLogger(
            "FyersAPI",
            log_level,
            stack_level=2,
            logger_handler=logging.FileHandler(self.log_path + "fyersApi.log"),
        )

        self.request_logger = FyersLogger(
            "FyersAPIRequest",
            "DEBUG",
            stack_level=2,
            logger_handler=logging.FileHandler(self.log_path + "fyersRequests.log"),
        )
        if is_async:
            self.service = FyersServiceAsync(self.api_logger, self.request_logger)
        else:
            self.service = FyersServiceSync(self.api_logger, self.request_logger)

    def get_profile(self) -> dict:
        """
        Retrieves the user profile information.

        """
        if self.is_async:
            response = self.service.get_async_call(Config.get_profile, self.header)
            
        else:
            response = self.service.get_call(Config.get_profile, self.header)
        return response

    def tradebook(self) -> dict:
        """
        Retrieves daily trade details of the day.

        """
        if self.is_async:
            response = self.service.get_async_call(Config.tradebook, self.header)
            
        else:
            response = self.service.get_call(Config.tradebook, self.header)
        return response

    def funds(self) -> dict:
        """
        Retrieves funds details.

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.get_async_call(Config.funds, self.header)
            
        else:
            response = self.service.get_call(Config.funds, self.header)
        return response

    def positions(self) -> dict:
        """
        Retrieves information about current open positions.

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.get_async_call(Config.positions, self.header)
            
        else:
            response = self.service.get_call(Config.positions, self.header)
        return response

    def holdings(self) -> dict:
        """
        Retrieves information about current holdings.

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.get_async_call(Config.holdings, self.header)
            
        else:
            response = self.service.get_call(Config.holdings, self.header)
        return response

    def logout(self) -> dict:
        """
        Invalidates the access token.

        """
        if self.is_async:
            response = self.service.post_async_call(Config.logout, self.header)
            
        else:
            response = self.service.post_call(Config.logout, self.header)
        return response

    def get_orders(self, data) -> dict:
        """
        Retrieves order details by ID.

        Args:
            data: The data containing the order ID.

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.get_async_call(Config.orderbook, self.header)
            
        else:
            response = self.service.get_call(Config.orderbook, self.header)
        id_list = data['id'].split(",")
        response["orderBook"]= [order for order in response["orderBook"] if order["id"] in id_list]

        return response

    def orderbook(self, data = None) -> dict:
        """
        Retrieves the order information.

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.get_async_call(Config.orderbook, self.header, data)
            
        else:
            response = self.service.get_call(Config.orderbook, self.header, data)
        return response
    
    def gtt_orderbook(self, data = None) -> dict:
        """
        Retrieves the gtt order information.

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.get_async_call(Config.gtt_orders, self.header, data)
            
        else:
            response = self.service.get_call(Config.gtt_orders, self.header, data)
        return response
    
    def market_status(self) -> dict:
        """
        Retrieves market status.

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.get_async_call(
                    Config.market_status, self.header, data_flag=True
                )
            
        else:
            response = self.service.get_call(
                Config.market_status, self.header, data_flag=True
            )
        return response

    def convert_position(self, data) -> dict:
        """
        Converts positions from one product type to another based on the provided details.

        Args:
            symbol (str): Symbol of the positions. Eg: "MCX:SILVERMIC20NOVFUT".
            positionSide (int): Side of the positions. 1 for open long positions, -1 for open short positions.
            convertQty (int): Quantity to be converted. Should be in multiples of lot size for derivatives.
            convertFrom (str): Existing product type of the positions. (CNC positions cannot be converted)
            convertTo (str): The new product type to convert the positions to.

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.post_async_call(
                    Config.convert_position, self.header, data
                )
            
        else:
            response = self.service.post_call(
                Config.convert_position, self.header, data
            )
        return response

    def cancel_order(self, data) -> dict:
        """
        Cancel order.

        Args:
            id (str, optional): ID of the position to close. If not provided, all open positions will be closed.


        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.delete_async_call(Config.orders_endpoint, self.header, data)
            
        else:
            response = self.service.delete_call(Config.orders_endpoint, self.header, data)
        return response
    
    def cancel_gtt_order(self,data) -> dict:
        """
        Cancel order.

        Args:
            id (str): Unique identifier for the order to be cancelled, e.g., "25010700000001".

        Returns:
            The response JSON as a dictionary.
        """

        if self.is_async:
            response = self.service.delete_async_call(Config.gtt_orders_sync, self.header, data)
        else:
            response = self.service.delete_call(Config.gtt_orders_sync, self.header, data)
        return response

    def place_order(self, data) -> dict:
        """
        Places an order based on the provided data.

        Args:
        data (dict): A dictionary containing the order details.
            - 'productType' (str): Type of the product. Possible values: 'CNC', 'INTRADAY', 'MARGIN', 'CO', 'BO'.
            - 'side' (int): Side of the order. 1 for Buy, -1 for Sell.
            - 'symbol' (str): Symbol of the product. Eg: 'NSE:SBIN-EQ'.
            - 'qty' (int): Quantity of the product. Should be in multiples of lot size for derivatives.
            - 'disclosedQty' (int): Disclosed quantity. Allowed only for equity. Default: 0.
            - 'type' (int): Type of the order. 1 for Limit Order, 2 for Market Order,
                            3 for Stop Order (SL-M), 4 for Stoplimit Order (SL-L).
            - 'validity' (str): Validity of the order. Possible values: 'IOC' (Immediate or Cancel), 'DAY' (Valid till the end of the day).
            - 'filledQty' (int): Filled quantity. Default: 0.
            - 'limitPrice' (float): Valid price for Limit and Stoplimit orders. Default: 0.
            - 'stopPrice' (float): Valid price for Stop and Stoplimit orders. Default: 0.
            - 'offlineOrder' (bool): Specifies if the order is placed when the market is open (False) or as an AMO order (True).
            - 'isSliceOrder' (bool): Specifies if the order is a slice order. Default: False.

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.post_async_call(Config.orders_endpoint, self.header, data)
        else:
            response = self.service.post_call(Config.orders_endpoint, self.header, data)
        return response
    
    def place_gtt_order(self,data) -> dict:
        """
        Places an order based on the provided data.

        Args:
        data (dict): A dictionary containing the order details.
            - 'id*' (str): Unique identifier for the order to be modified, e.g., "25010700000001".
            - 'side' (int): Indicates the side of the order: 1 for buy, -1 for sell.
            - 'symbol' (str): The instrument's unique identifier, e.g., "NSE:CHOLAFIN-EQ"
            - 'productType*' (str): The product type for the order. Valid values: "CNC", "MARGIN", "MTF".
            - 'orderInfo*' (object): Contains information about the GTT/OCO order legs.
            - 'orderInfo.leg1*' (object): Details for GTT order leg. Mandatory for all orders.
            - 'orderInfo.leg1.price*' (number): Price at which the order.
            - 'orderInfo.leg1.triggerPrice' (number): 	Trigger price for the GTT order. NOTE: for OCO order this leg trigger price should be always above LTP
            - 'orderInfo.leg1.qty*' (int): Quantity for the GTT order leg.
            - 'orderInfo.leg2*' (object): Details for OCO order leg. Optional and included only for OCO orders.
            - 'orderInfo.leg2.price*' (number): Price at which the second leg of the OCO order should be placed.
            - 'orderInfo.leg2.triggerPrice*' (number): Trigger price for the second leg of the OCO order.NOTE: for OCO order this leg trigger price should be always below LTP
            - 'orderInfo.leg2.qty*' (integer): Quantity for the second leg of the OCO order.

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.post_async_call(Config.gtt_orders_sync, self.header, data)
        else:
            response = self.service.post_call(Config.gtt_orders_sync, self.header, data)
        return response

    def modify_order(self, data) -> dict:
        """
        Modifies the parameters of a pending order based on the provided details.

        Parameters:
            id (str): ID of the pending order to be modified.
            limitPrice (float, optional): New limit price for the order. Mandatory for Limit/Stoplimit orders.
            stopPrice (float, optional): New stop price for the order. Mandatory for Stop/Stoplimit orders.
            qty (int, optional): New quantity for the order.
            type (int, optional): New order type for the order.

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.patch_async_call(Config.orders_endpoint, self.header, data)
            
        else:
            response = self.service.patch_call(Config.orders_endpoint, self.header, data)
        return response
    
    def modify_gtt_order(self,data) -> dict:
        """
        Modifies the parameters of a pending order based on the provided details.

        Parameters:
            id (str): 	Unique identifier for the order to be modified, e.g., "25010700000001"
            orderInfo* (object): Contains updated information about the GTT/OCO order legs.
            orderInfo.leg1* (object): Details for GTT order leg. Mandatory for all modifications.
            orderInfo.leg1.price* (number): Updated price at which the order should be placed.
            orderInfo.leg1.triggerPrice* (number): Updated trigger price for the GTT order. NOTE: for OCO order this leg trigger price should be always above LTP.
            orderInfo.leg1.qty** (integer): Updated quantity for the GTT order leg.
            orderInfo.leg2* (object): Details for OCO order leg. Required if the order is an OCO type.
            orderInfo.leg2.triggerPrice* (number): Updated trigger price for the second leg of the OCO order.NOTE: for OCO order this leg trigger price should be always below LTP.
            orderInfo.leg2.qty* (integer): Updated quantity for the second leg of the OCO order.

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.patch_async_call(Config.gtt_orders_sync, self.header, data)
        else:
            response = self.service.patch_call(Config.gtt_orders_sync, self.header, data)
        return response

    def exit_positions(self, data={}) -> dict:
        """
        Closes open positions based on the provided ID or closes all open positions if ID is not passed.

        Args:
            id (str, optional): ID of the position to close. If not provided, all open positions will be closed.


        Returns:
            The response JSON as a dictionary.
        """
        if len(data) == 0 :
            data = {"exit_all": 1}

        if self.is_async:
            response = self.service.delete_async_call(Config.positions, self.header, data)
            
        else:
            response = self.service.delete_call(Config.positions, self.header, data)
        return response
    
    
    def place_multileg_order(self, data) -> dict:
        """
        Places an multileg order based on the provided data.

        Args:
        data (dict): A dictionary containing the order details.
            - 'productType' (str): Type of the product. Possible values: 'INTRADAY', 'MARGIN'.
            - 'offlineOrder' (bool): Specifies if the order is placed when the market is open (False) or as an AMO order (True).
            - 'orderType' (str): Type of multileg. Possible values: '3L' for 3 legs and '2L' for 2 legs .
            - 'validity' (str): Validity of the order. Possible values: 'IOC' (Immediate or Cancel).
            legs (dict): A dictionary containing multiple legs order details.
                - 'symbol' (str): Symbol of the product. Eg: 'NSE:SBIN-EQ'.
                - 'qty' (int): Quantity of the product. Should be in multiples of lot size for derivatives.
                - 'side' (int): Side of the order. 1 for Buy, -1 for Sell.
                - 'type' (int): Type of the order. Possible values: 1 for Limit Order.
                - 'limitPrice' (float): Valid price for Limit and Stoplimit orders.

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.post_async_call(Config.multileg_orders, self.header, data)
        else:
            response = self.service.post_call(Config.multileg_orders, self.header, data)
        return response

    def generate_data_token(self, data):
        allPackages = subprocess.check_output([sys.executable, "-m", "pip", "freeze"])
        installed_packages = [r.decode().split("==")[0] for r in allPackages.split()]
        if Config.data_vendor_td not in installed_packages:
            print("Please install truedata package | pip install truedata-ws")
        response = self.service.post_call(Config.generate_data_token, self.header, data)
        return response

    def cancel_basket_orders(self, data):
        """
        Cancels the orders with the provided IDs.

        Parameters:
            order_ids (list): A list of order IDs to be cancelled.

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.delete_async_call(
                    Config.multi_orders, self.header, data
                )
            
        else:
            response = self.service.delete_call(
                Config.multi_orders, self.header, data
            )
        return response

    def place_basket_orders(self, data):
        """
        Places multiple orders based on the provided details.

        Parameters:
        orders (list): A list of dictionaries containing the order details.
            Each dictionary should have the following keys:
            - 'symbol' (str): Symbol of the product. Eg: 'MCX:SILVERM20NOVFUT'.
            - 'qty' (int): Quantity of the product.
            - 'type' (int): Type of the order. 1 for Limit Order, 2 for Market Order, and so on.
            - 'side' (int): Side of the order. 1 for Buy, -1 for Sell.
            - 'productType' (str): Type of the product. Eg: 'INTRADAY', 'CNC', etc.
            - 'limitPrice' (float): Valid price for Limit and Stoplimit orders.
            - 'stopPrice' (float): Valid price for Stop and Stoplimit orders.
            - 'disclosedQty' (int): Disclosed quantity. Allowed only for equity.
            - 'validity' (str): Validity of the order. Eg: 'DAY', 'IOC', etc.
            - 'offlineOrder' (bool): Specifies if the order is placed when the market is open (False) or as an AMO order (True).
            - 'stopLoss' (float): Valid price for CO and BO orders.
            - 'takeProfit' (float): Valid price for BO orders.


        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.post_async_call(Config.multi_orders, self.header, data)
            
        else:
            response = self.service.post_call(
                Config.multi_orders, self.header, data
            )
        return response

    def modify_basket_orders(self, data):
        """
        Modifies multiple pending orders based on the provided details.

        Parameters:
        orders (list): A list of dictionaries containing the order details to be modified.
            Each dictionary should have the following keys:
            - 'id' (str): ID of the pending order to be modified.
            - 'limitPrice' (float): New limit price for the order. Mandatory for Limit/Stoplimit orders.
            - 'stopPrice' (float): New stop price for the order. Mandatory for Stop/Stoplimit orders.
            - 'qty' (int): New quantity for the order.
            - 'type' (int): New order type for the order.

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.patch_async_call(
                    Config.multi_orders, self.header, data
                )
            
        else:
            response = self.service.patch_call(
                Config.multi_orders, self.header, data
            )
        return response

    def history(self, data=None):
        """
        Fetches candle data based on the provided parameters.

        Parameters:
        symbol (str): Symbol of the product. Eg: 'NSE:SBIN-EQ'.
        resolution (str): The candle resolution. Possible values are:
            'Day' or '1D', '1', '2', '3', '5', '10', '15', '20', '30', '60', '120', '240'.
        date_format (int): Date format flag. 0 to enter the epoch value, 1 to enter the date format as 'yyyy-mm-dd'.
        range_from (str): Start date of the records. Accepts epoch value if date_format flag is set to 0,
            or 'yyyy-mm-dd' format if date_format flag is set to 1.
        range_to (str): End date of the records. Accepts epoch value if date_format flag is set to 0,
            or 'yyyy-mm-dd' format if date_format flag is set to 1.
        cont_flag (int): Flag indicating continuous data and future options. Set to 1 for continuous data.


        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.get_async_call(
                    Config.history, self.header, data, data_flag=True
                )
            
        else:
            response = self.service.get_call(
                Config.history, self.header, data, data_flag=True
            )
        return response

    def quotes(self, data=None):
        """
        Fetches quotes data for multiple symbols.

        Parameters:
            symbols (str): Comma-separated symbols of the products. Maximum symbol limit is 50. Eg: 'NSE:SBIN-EQ,NSE:HDFC-EQ'.


        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            
            response =   self.service.get_async_call(
                    Config.quotes, self.header, data, data_flag=True
                )
            
        else:
            response = self.service.get_call(
                Config.quotes, self.header, data, data_flag=True
            )
        return response

    def depth(self, data=None):
        """
        Fetches market depth data for a symbol.

        Parameters:
            symbol (str): Symbol of the product. Eg: 'NSE:SBIN-EQ'.
            ohlcv_flag (int): Flag to indicate whether to retrieve open, high, low, closing, and volume quantity. Set to 1 for yes.

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
                response = self.service.get_async_call(
                    Config.market_depth, self.header, data, data_flag=True
                )
            
        else:
            response = self.service.get_call(
                Config.market_depth, self.header, data, data_flag=True
            )
        return response


    def optionchain(self, data=None):
        """
        Fetches option chain data for a given symbol.

        Parameters:
            symbol (str): The symbol of the product. For example, 'NSE:NIFTY50-INDEX'.
            timestamp (int): Expiry timestamp of the stock. Use empty for current expiry. Example: 1813831200.
            strikecount (int): Number of strike price data points desired. 
                For instance, setting it to 7 provides: 1 INDEX + 7 ITM + 1 ATM + 7 OTM = 1 INDEX and 15 STRIKE (15 CE + 15 PE).
            greeks (string): Set greeks to 1 for greeks data which includes delta, gamma, theta, vega and iv.
    

        Returns:
            dict: The response JSON containing the option chain data.
        """
        if self.is_async:
                response = self.service.get_async_call(
                    Config.option_chain, self.header, data, data_flag=True
                )
            
        else:
            response = self.service.get_call(
                Config.option_chain, self.header, data, data_flag=True
            )
        return response
    
    def create_alert(self, data) -> dict:
        """
        Creates a new price alert for a user.

        Args:
            data (dict): A dictionary containing the alert details.
                Required:
                    - alert-type (int): Type of alert. 1 usually means price-based alert.
                    - name (str): User-provided name/label for the alert.
                    - symbol (str): Trading symbol in full format.
                        Eg: "NSE:SBIN-EQ", "NSE:SILVERMIC25DECFUT"
                    - comparisonType (str): Price parameter used for comparison.
                        Allowed: "OPEN", "HIGH", "LOW", "CLOSE", "LTP"
                    - condition (str): Price comparison operator.
                        Allowed: "GT" (greater), "LT" (lesser), "EQ" (equal)
                    - value (float/int/str): Target price against which comparison is performed.
                Optional:
                    - agent (str): Source of alert creation. Eg: "fyers-api"
                    - notes (str): Additional notes for the alert.

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.post_async_call(Config.price_alert, self.header, data)
        else:
            response = self.service.post_call(Config.price_alert, self.header, data)
        return response
       
    def get_alert(self, data=None) -> dict:
        """
        Retrieves alert details. If data with 'id' is provided, filters alerts by ID(s).
        Otherwise, returns all alerts. Supports fetching archived alerts via 'archive' parameter.

        Args:
            data (dict, optional): Optional dictionary containing query parameters.
                - 'archive' (int, optional): Set to 1 to retrieve archived alerts instead of active alerts.
                    Default: 0 (active alerts)

        Returns:
            The response JSON as a dictionary :
        """
        if data is None:
            data = {}
        
        if self.is_async:
            response = self.service.get_async_call(Config.price_alert, self.header, data)
        else:
            response = self.service.get_call(Config.price_alert, self.header, data)
        return response

    def delete_alert(self, data) -> dict:
        """
        Deletes a price alert.

        Args:
            data (dict): A dictionary containing the alert deletion details.
                Required Attributes:
                    - alertId (str): Alert ID from creation
                Optional Attributes:
                    - agent (str): Client calling the API (e.g., "fyers-api")

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.delete_async_call(Config.price_alert, self.header, data)
        else:
            response = self.service.delete_call(Config.price_alert, self.header, data)
        return response     

    def update_alert(self, data) -> dict:
        """
        Modifies the parameters of an existing alert based on the provided details.

        Args:
            data (dict): A dictionary containing the alert modification details.
                Required Attributes:
                    - alertId (str): ID of the alert to be modified. Eg: "3870991"
                    - alert-type (int): Type of alert. 1 usually means price-based alert.
                    - symbol (str): Trading symbol in full format.
                        Eg: "NSE:SBIN-EQ", "NSE:SILVERMIC25DECFUT"
                    - comparisonType (str): Price parameter used for comparison.
                        Allowed: "OPEN", "HIGH", "LOW", "CLOSE", "LTP"
                    - condition (str): Price comparison operator.
                        Allowed: "GT" (greater), "LT" (lesser), "E" (equal)
                    - value (float/int/str): Target price against which comparison is performed.
                    - name (str): User-provided name/label for the alert.
                Optional Attributes:
                    - agent (str): Source of alert creation. Eg: "fyers-api"
                    

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.put_async_call(Config.price_alert, self.header, data)
        else:
            response = self.service.put_call(Config.price_alert, self.header, data)
        return response

    def toggle_alert(self, data) -> dict:
        """
        Toggles the status of an existing alert between enabled (1) and disabled (2).
        If the alert is currently disabled, it will be enabled. If enabled, it will be disabled.

        Args:
            data (dict): A dictionary containing the alert toggle details.
                - 'alertId' (str, mandatory): ID of the alert to be toggled. Eg: "3870991"

        Returns:
            The response JSON as a dictionary with success message indicating the alert status has been modified.
        """
        if self.is_async:
            response = self.service.put_async_call(Config.toggle_alert, self.header, data)
        else:
            response = self.service.put_call(Config.toggle_alert, self.header, data)
        return response
    
    def create_smart_order_step(self, data: dict) -> dict:
        """
        Creates a step smart order based on the provided data.

        Args:
            data (dict): A dictionary containing the smart order creation details.
               Required Attributes:
                - symbol (str): Symbol of the product. Eg: "NSE:SBIN-EQ"
                - side (int): Side of the order. 1 for Buy, -1 for Sell
                - qty (int): Total quantity of the product
                - productType (str): Type of the product. Possible values: 'CNC', 'INTRADAY', 'MARGIN'
                - avgqty (int): Average quantity per step
                - avgdiff (int): Average difference between steps
                - direction (int): Direction of the order
                - orderType (int): Type of the order
                - startTime (int): Start time in epoch format
                - endTime (int): End time in epoch format
                
               Conditional Attributes:  
                - limitPrice (float): Limit price for the order
                
               Optional Attributes:   
                - initQty (int): Initial quantity to be placed
                - hpr (float): Higher price range
                - lpr (float): Lower price range
                - mpp (int): Maximum price per order

        Returns:
            dict: The response JSON as a dictionary.
        """

       
        
        if self.is_async:
            response = self.service.post_async_call(Config.create_smartorder_step, self.header, data)
        else:
            response = self.service.post_call(Config.create_smartorder_step, self.header, data) 
        return response
    
    async def close(self):
        """
        Closes the HTTP session(s) to properly clean up resources.
        Should be called when done with the FyersModel instance, especially for async mode.
        """
        if self.is_async:
            if hasattr(self, 'async_session') and self.async_session:
                await self.async_session.close()
                self.async_session = None
            if hasattr(self, 'service') and hasattr(self.service, 'close'):
                await self.service.close()
        else:
            if hasattr(self, 'session') and self.session:
                self.session.close()
                self.session = None
    

    def create_smart_order_limit(self,data: dict) -> dict:
        """
        Creates a Smart Limit Order based on the provided data.
        
        Smart Limit Orders allow you to place limit orders that remain active until the specified end time.
        Once the end time is reached, the order can be converted to an MPP order or cancelled.

        Args:
            data (dict): A dictionary containing the smart order creation details.
                Required Attributes:
                    - symbol (str): The instrument's unique identifier, e.g., "NSE:SBIN-EQ"
                    - side (int): Order side: 1 for Buy, -1 for Sell (enum: 1, -1)
                    - qty (int): Order quantity (Min: 1, Max: 999999; must be a multiple of lot size)
                    - productType (str): Must be one of: "CNC", "MARGIN", "INTRADAY", "MTF"
                    - limitPrice (number): The price at which the order should be placed (Min: 0.01)
                    - endTime (int): Order expiry time as a Unix timestamp (epoch)
                    - orderType (int): Order type: 1 for Limit, 4 for Stop-Limit (enum: 1, 4)
                    - onExp (int): Action on expiry: 1 = Cancel, 2 = Market (enum: 1, 2)
                
                Optional Attributes:
                    - stopPrice (number): Default: 0. Required when orderType is 4 (Stop-Limit)
                    - hpr (number): Default: 0. 0 = no upper price limit. If provided, order executes only below this price
                    - lpr (number): Default: 0. 0 = no lower price limit. If provided, order executes only above this price
                    - mpp (number): Default: 0. 0 = no market protection. Valid values: 0–3 or -1 (disabled)

        Returns:
            dict: The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.post_async_call(Config.create_smartorder_limit, self.header, data)
        else:
            response = self.service.post_call(Config.create_smartorder_limit, self.header, data) 
        return response
    
    def create_smart_order_trail(self, data: dict) -> dict:
        """
        Creates a Smart Trail Order (Trailing Stop Loss) based on the provided data.
        
        A Smart Trail Order is a trailing stop-loss that automatically adjusts the stop price as the market moves 
        in your favour. The stop price trails the market by a specified jump price.

        Args:
            data (dict): A dictionary containing the smart order creation details.
                Required Attributes:
                    - symbol (str): The instrument's unique identifier, e.g., "NSE:SBIN-EQ"
                    - side (int): Order side: 1 for Buy, -1 for Sell (enum: 1, -1)
                    - qty (int): Order quantity (Min: 1, Max: 999999; must be a multiple of lot size)
                    - productType (str): Must be one of: "CNC", "MARGIN", "INTRADAY", "MTF"
                    - orderType (int): Order type: 1 for Limit Order, 2 for Market Order (enum: 1, 2)
                    - stopPrice (number): Initial stop/trigger price (must be greater than 0)
                    - jump_diff (number): Jump price — the value by which the stop price trails (Min: 0.2)
                
                Optional Attributes:
                    - limitPrice (number): Default: 0. If not provided, executes at market price. Required if orderType = 1
                    - target_price (number): Default: 0 (no target). If provided, must be greater than current LTP
                    - mpp (number): Default: 0 (no market protection). Valid values: 0–3 or -1 (disabled)

        Returns:
            dict: The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.post_async_call(Config.create_smartorder_trail, self.header, data)
        else:
            response = self.service.post_call(Config.create_smartorder_trail, self.header, data) 
        return response
    
    def create_smart_order_sip(self, data: dict) -> dict:
        """
        Creates a Smart SIP (Systematic Investment Plan) order based on the provided data.
        
        Smart SIP allows you to automate recurring investments in equity stocks, ETFs, with orders placed automatically 
        at your selected frequency—daily, weekly, monthly, or on custom dates.

        Args:
            data (dict): A dictionary containing the smart order creation details.
                Required Attributes:
                    - symbol (str): The instrument's unique identifier (Equity only), e.g., "NSE:SBIN-EQ"
                    - productType (str): Must be one of: "CNC", "MTF"
                    - freq (int): SIP frequency (enum: 1, 2, 3, 6)
                    - sip_day (int): Day of the month for SIP execution (Min: 1, Max: 28)
                    - qty OR amount (int/number): At least one required - Quantity or amount per SIP instalment (Max: 999999)
                
                Conditional Attributes:
                    - sip_time (int): Required if freq = 1 (Daily). Unix timestamp for SIP execution time (must be within market hours)
                
                Optional Attributes:
                    - imd_start (bool): Whether to start SIP immediately. true = start now, false = wait for schedule
                    - endTime (int): Default: 0 (no end date). Unix timestamp when the SIP should end
                    - hpr (number): Default: 0. Skips SIP if price is above this upper limit
                    - lpr (number): Default: 0. Skips SIP if price is below this lower limit
                    - step_up_freq (int): Frequency of step-up increase (enum: 3, 5). Default: 0 (no step-up)
                    - step_up_qty (int): Quantity to increase at each step-up (Default: 0; Max: 999999)
                    - step_up_amount (number): Amount to increase at each step-up (Default: 0; Max: 999999)
                    - exp_qty (int): Quantity for expiry/final SIP order (Default: 0; Max: 999999)

        Returns:
            dict: The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.post_async_call(Config.create_smartorder_sip, self.header, data)
        else:
            response = self.service.post_call(Config.create_smartorder_sip, self.header, data) 
        return response
    
    
        
    
    def modify_smart_order(self, data) -> dict:
        """
        Modifies a smart order based on the provided data.

        Args:
            data (dict): A dictionary containing the smart order modification details.

                Required:
                    - flowId (str): Unique identifier of the Smart Order to be modified

                Optional (by order type/flowtype):

                    Limit Order (flowtype: 4):
                        - qty (int): To update order quantity
                        - limitPrice (number): To update limit price
                        - stopPrice (number): To update stop/trigger price
                        - endTime (int): To update expiry time (Unix timestamp)
                        - hpr (number): To update upper price limit (High Price Range)
                        - lpr (number): To update lower price limit (Low Price Range)
                        - mpp (number): To update market protection percentage
                        - onExp (int): To update expiry action (1 = Cancel, 2 = Market Order)

                    Trail Order (flowtype: 6):
                        - qty (int): To update order quantity
                        - limitPrice (number): To update limit price (required if orderType = 1; must be 0 if orderType = 2)
                        - stopPrice (number): To update stop/trigger price
                        - jump_diff (number): To update jump value for trailing stop
                        - target_price (number): To update target price (optional profit booking)
                        - mpp (number): To update market protection percentage

                    Step Order (flowtype: 3):
                        - qty (int): To update total order quantity
                        - startTime (int): To update order start time
                        - endTime (int): To update order end time
                        - hpr (number): To update upper price limit (High Price Range)
                        - lpr (number): To update lower price limit (Low Price Range)
                        - mpp (number): To update market protection percentage
                        - avgqty (int): To update quantity per averaging step
                        - avgdiff (number): To update price gap between steps
                        - initQty (int): To update initial quantity (only before order starts)
                        - limitPrice (number): To update limit price (only before order starts)
                        - direction (int): To update direction for averaging (1 = price drop, -1 = price rise)

                    SIP Order (flowtype: 7):
                        - qty (int): To update investment quantity per instalment
                        - amount (number): To update investment amount per instalment
                        - hpr (number): To update upper price limit (skip if price is above this)
                        - lpr (number): To update lower price limit (skip if price is below this)
                        - sip_day (int): To update SIP day (applicable for monthly/custom frequency)
                        - sip_time (int): To update SIP time (required for daily/custom frequency)
                        - step_up_amount (number): To update step-up amount (amount-based SIP only)
                        - step_up_qty (int): To update step-up quantity (qty-based SIP only)
                        - exp_qty (int): To update expiry quantity
                        - exp_amount (number): To update expiry amount

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.patch_async_call(Config.modify_smartorder, self.header, data)
        else:
            response = self.service.patch_call(Config.modify_smartorder, self.header, data)
        return response

    def cancel_smart_order(self, data) -> dict:
        """
        Cancels a smart order based on the provided data.

        Args:
            data (dict): A dictionary containing the smart order cancellation details.
                Required:
                    - flowId (str): Unique identifier of the smart order flow to cancel

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.delete_async_call(Config.cancel_smartorder, self.header, data)
        else:
            response = self.service.delete_call(Config.cancel_smartorder, self.header, data)
        return response

    def pause_smart_order(self, data) -> dict:
        """
        Pauses a smart order based on the provided data.

        Args:
            data (dict): A dictionary containing the smart order pause details.
                Required:
                    - flowId (str): Unique identifier of the smart order flow to pause

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.patch_async_call(Config.pause_smartorder, self.header, data)
        else:
            response = self.service.patch_call(Config.pause_smartorder, self.header, data)
        return response

    def resume_smart_order(self, data) -> dict:
        """
        Resumes a paused smart order based on the provided data.

        Args:
            data (dict): A dictionary containing the smart order resume details.
                Required:
                    - flowId (str): Unique identifier of the smart order flow to resume

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.patch_async_call(Config.resume_smartorder, self.header, data)
        else:
            response = self.service.patch_call(Config.resume_smartorder, self.header, data)
        return response

    def smart_orderbook_with_filter(self, data=None) -> dict:
        """
        Retrieves smart order book information with optional filters.

        Optional Query Parameters (pass as keys in data dict for GET query params):
            - flowtype (int[]): Filter by order type (repeatable). 3 = Step, 4 = Limit, 5 = Peg, 6 = Trail, 7 = SIP. Default: all types
            - messageType (int[]): Filter by order status/message type (repeatable). Default: all
            - page_no (int): Page number for pagination. Default: 1
            - page_size (int): Number of records per page. Default: 15
            - sort_by (str): Sort by field: "CreatedTime", "UpdatedTime", "Alphabet". Default: "UpdatedTime"
            - ord_by (int): Sort order: 1 for ascending, -1 for descending. Default: -1
            - side (int[]): Filter by side (repeatable). 1 for buy, -1 for sell. Default: all
            - exchange (str[]): Filter by exchange (repeatable). "NSE", "BSE", "MCX". Default: all
            - product (str[]): Filter by product type (repeatable). "CNC", "MARGIN", "INTRADAY", "MTF". Default: all
            - search (str): Search by symbol name. Default: none

        Args:
            data (dict, optional): A dictionary containing the optional query parameters above.

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.get_async_call(Config.smartorder_orderbook, self.header, data)
        else:
            response = self.service.get_call(Config.smartorder_orderbook, self.header, data)
        return response


    def create_smartexit_trigger(self, data) -> dict:
        """
        Creates a new smart exit trigger based on the provided data.
        
        Smart exit triggers support three types of strategies:
        
        Type 1: Only Alert (notification only, no auto-exit)
            - Sends notification when profit/loss thresholds are reached
            - Does not automatically exit positions
            - Example:
                {
                    "name": "Alert Only Strategy",
                    "type": 1,
                    "profitRate": 5000,
                    "lossRate": -2000
                }
        
        Type 2: Exit with Alert (notification + immediate exit)
            - Sends notification and immediately exits positions when thresholds are reached
            - Example:
                {
                    "name": "Auto Exit Strategy",
                    "type": 2,
                    "profitRate": 5000,
                    "lossRate": -2000
                }
        
        Type 3: Exit with Alert + Wait for Recovery (notification + delayed exit)
            - Sends notification and waits for recovery before exiting
            - Requires waitTime parameter (in minutes)
            - Example:
                {
                    "name": "Recovery Exit Strategy",
                    "type": 3,
                    "profitRate": 10000,
                    "lossRate": -3000,
                    "waitTime": 5
                }

        Args:
            data (dict): A dictionary containing the smart exit trigger creation details.
                - name (str): Name of the smart exit trigger strategy
                - type (int): Type of the trigger (1: Alert only, 2: Exit with alert, 3: Exit with alert + wait for recovery)
                - profitRate (float): Profit rate threshold (positive value, e.g., 5000)
                - lossRate (float): Loss rate threshold (negative value, e.g., -2000)
                - waitTime (int, optional): Wait time in minutes (required for type 3, default: 0)

        """
        if self.is_async:
            response = self.service.post_async_call(Config.smartexit_trigger, self.header, data)
        else:
            response = self.service.post_call(Config.smartexit_trigger, self.header, data)
        return response

    def get_smartexit_triggers(self, data=None) -> dict:
        """
        Retrieves smart exit trigger information.

        Args:
            data (dict, optional): A dictionary containing parameters for filtering smart exit triggers.

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.get_async_call(Config.smartexit_trigger, self.header, data)
        else:
            response = self.service.get_call(Config.smartexit_trigger, self.header, data)
        return response

    def update_smartexit_trigger(self, data) -> dict:
        """
        Updates an existing smart exit trigger based on the provided data.
        
        Use this endpoint to modify a Smart Exit trigger. You can update the target values, exit type, or wait time.
        If the trigger is active, updates are validated against the current P&L.
        Either a profit target or a loss limit must be provided.
        
        Exit Types (type field):
            - Value 1: Only Alert - Notification Only
                Sends a notification when target is hit. Does NOT exit positions automatically.
            - Value 2: Exit with Alert - Notification + Immediate Exit
                Sends notification AND exits all intraday positions immediately.
            - Value 3: Exit with Alert (Wait for Recovery) - Notification + Delayed Exit
                Sends notification, waits for waitTime minutes, then exits positions.

        Args:
            data (dict): A dictionary containing the smart exit trigger update details.
                Required Attributes:
                    - flowId (str): The unique identifier of the smart exit to update
                
                Optional Attributes:
                    - name (str): Unique name for your Smart Exit trigger
                    - profitRate (number): Book profit value (positive) or Minimize loss value (negative). 
                                         (Min: -1,00,00,000, Max: 1,00,00,000)
                    - lossRate (number): Max loss value (negative) or Min profit value (positive). 
                                       (Min: -1,00,00,000, Max: 1,00,00,000)
                    - type (int): Exit type (enum: 1, 2, 3). Default is 1 if not provided.
                    - waitTime (int): Wait time in minutes (required if type=3). Default: 0 (Min: 0, Max: 60)
                
                Note: Either profitRate or lossRate must be provided.

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.put_async_call(Config.smartexit_trigger, self.header, data)
        else:
            response = self.service.put_call(Config.smartexit_trigger, self.header, data)
        return response

    def activate_deactivate_smartexit_trigger(self, data) -> dict:
        """
        Activates a smart exit trigger based on the provided data.

        Args:
            data (dict): A dictionary containing the smart exit trigger activation details.
                - flowId (str): Unique identifier of the smart exit trigger flow to activate

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.post_async_call(Config.activate_smartexit_trigger, self.header, data)
        else:
            response = self.service.post_call(Config.activate_smartexit_trigger, self.header, data)
        return response
    
    def orderhistory(self, data) -> dict:
        """
        Retrieves order history based on the provided data.
        Args:
        data (dict): A dictionary containing the order history details.
            - 'symbol' (str): Symbol of the product. Eg: 'NSE:SBIN-EQ'.
            - 'from_date' (str): Start date of the records in YYYY-MM-DD format.
            - 'to_date' (str): End date of the records in YYYY-MM-DD format.
            - 'page_no' (int): Page number for pagination. Default: 1
            - 'page_size' (int): Number of records per page. Default: 100
            - 'segment_type' (str): 0 => Includes all segments, 1 => Includes only Equity, 2 => Includes only Equity Derivatives, 3 => Includes Currency Derivatives, 4 => Includes only Commodity Derivatives
            - 'exchange_type' (str): 0 => Includes all exchanges, 1 => Includes only NSE, 2 => Includes only BSE, 3 => Includes only MCX
            - 'status' (str): 0 => All Status, 1 => Executed, 2 => Cancelled, 3 => Rejected

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.get_async_call(Config.orderhistory, self.header, data)
        else:
            response = self.service.get_call(Config.orderhistory, self.header, data)
        return response
    
    def tradehistory(self, data) -> dict:
        """
        Retrieves trade history based on the provided data.

        Args:
        data (dict): A dictionary containing the trade history details.
            - 'symbol' (str): Symbol of the product. Eg: 'NSE:SBIN-EQ'.
            - 'from_date' (str): Start date of the records in YYYY-MM-DD format.
            - 'to_date' (str): End date of the records in YYYY-MM-DD format.
            - 'page_no' (int): Page number for pagination. Default: 1
            - 'page_size' (int): Number of records per page. Default: 100
            - 'segment_type' (str): 0 => Includes all segments, 1 => Includes only Equity, 2 => Includes only Equity Derivatives, 3 => Includes Currency Derivatives, 4 => Includes only Commodity Derivatives
            - 'exchange_type' (str): 0 => Includes all exchanges, 1 => Includes only NSE, 2 => Includes only BSE, 3 => Includes only MCX

        Returns:
            The response JSON as a dictionary.
        """
        if self.is_async:
            response = self.service.get_async_call(Config.tradeHistory, self.header, data)
        else:
            response = self.service.get_call(Config.tradeHistory, self.header, data)
        return response

    