from django.conf.urls import url

from webgis.wsdp.views import lv


urlpatterns = [
    url(r"^lv/(?P<typ>\w+)/(?P<vypis>[na])/(?P<lv_id>\d+)/(?P<obec>\w+)$", lv, name="lv")
]
